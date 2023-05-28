<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Http\Requests\CourseStoreRequest;
use App\Http\Requests\CourseUpdateRequest;
use App\Http\Resources\CourseResource;
use App\Models\Course;
use Illuminate\Http\JsonResponse;

class CourseController extends Controller
{
	public function index()
	{
		$course = Course::paginate(10);
		return CourseResource::collection($course);

		Course::with('studyProgram')->get();
		Course::with('creator')->get();
	}

	/**
	 * Store a newly created resource in storage.
	 */
	public function store()
	{
		//code here
	}

	/**
	 * Display the specified resource.
	 */
	public function show()
	{
		//code here
	}

	/**
	 * Update the specified resource in storage.
	 */
	public function update()
	{
		//code here
	}

	/**
	 * Remove the specified resource from storage.
	 */
	public function destroy(Course $Course): JsonResponse
	{
		$Course->delete();
		return response()->json(['message' => 'Course deleted']);
	}
}
