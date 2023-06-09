import httpcode from "http-status-codes";
import handlebars from "handlebars";

import config from "../config/index.js";
import mailer from "../sdk/mailer/index.js";
import Errors from "../sdk/errors/errors.js";
import * as emailrepo from "../repositories/email_repository.js";
import * as constants from "../constants/index.js";

export default class EmailService {
  constructor() {}

  /*
   *    all parameters is required ;) except for data
   *    @throws {Errors}
   */
  async sendEmail(to, cc, bcc, subject, text, html, attachments, data) {
    // template engine
    if (data) {
      try {
        if (text) text = this.compileTemplate(text, data);
        if (html) html = this.compileTemplate(html, data);
      } catch (error) {
        throw new Errors(error.message, httpcode.BAD_REQUEST);
      }
    }

    let email = {
      to: to,
      cc: cc,
      bcc: bcc,
      subject: subject,
      from: config.mailFrom0,

      text: text,
      html: html,
      attachments: attachments,
    };
    // send email
    let info;
    try {
      info = await mailer.transport.sendMail(email);
      email.accepted = info.accepted;
      email.rejected = info.rejected;
      email.messageId = info.messageId;
      email.status = constants.EMAIL_STATUS_SENT;
    } catch (error) {
      email.status = constants.EMAIL_STATUS_NOT_SENT;

      try {
        await emailrepo.create(email);
      } catch (error) {
        throw new Errors(error, httpcode.INTERNAL_SERVER_ERROR);
      }

      throw new Errors(error, httpcode.INTERNAL_SERVER_ERROR);
    }
    return info;
  }

  /*
   *    @throws {Errors}
   */
  compileTemplate(templateText, data) {
    if (data) {
      try {
        const template = handlebars.compile(templateText);
        return template(data);
      } catch (error) {
        throw new Errors(error, httpcode.BAD_REQUEST);
      }
    }
    return templateText;
  }

  /*
   *  @throws {Errors}
   *  @returns {Array} entities.email
   */
  async getEmails(limit, skip, search) {
    try {
      return await emailrepo.getEmails(limit, skip, search);
    } catch (error) {
      throw new Errors(error.message, httpcode.INTERNAL_SERVER_ERROR);
    }
  }

  /*
   *    @throws {Errors}
   *    @returns {entities.email}
   */
  async getById(id) {
    let email;
    try {
      email = await emailrepo.getById(id);
    } catch (error) {
      throw new Errors(error, httpcode.INTERNAL_SERVER_ERROR);
    }
    if (email == null) {
      throw new Errors("email not found", httpcode.NOT_FOUND);
    }

    return email;
  }

  /*
   *    @throws {Errors}
   *    @returns {void}
   */
  async deleteById(id) {
    let deletedCount;
    try {
      deletedCount = await emailrepo.deleteById(id);
    } catch (error) {
      throw Errors(error, httpcode.INTERNAL_SERVER_ERROR);
    }
    if (deletedCount === 0)
      throw new Errors("email not found", httpcode.NOT_FOUND);
  }

  /**
   * @param {string} id
   * @return {SMTPTransport.SentMessageInfo} info
   * @memberof EmailService
   */
  async resendById(id) {
    // get by id
    let email;
    try {
      email = await this.getById(id);
    } catch (error) {
      throw error;
    }

    // check if status SENT, then no need to resend
    if (email.status == constants.EMAIL_STATUS_SENT) {
      throw new Errors("email has already been sent", httpcode.CONFLICT);
    }

    // send email
    let info;
    try {
      info = await this.sendEmail(
        email.to,
        email.cc,
        email.bcc,
        email.subject,
        email.text,
        email.html,
        email.attachments
      );
    } catch (error) {
      throw error;
    }

    try {
      let { n, nModified, ok } = await emailrepo.updateToSent(id);
    } catch (error) {
      throw new Errors(error.message, httpcode.INTERNAL_SERVER_ERROR);
    }

    return info;
  }
}
