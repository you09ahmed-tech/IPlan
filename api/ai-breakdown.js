import OpenAI from "openai";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({
      error: "Only POST requests are allowed.",
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return response.status(500).json({
      error: "Missing OPENAI_API_KEY environment variable.",
    });
  }

  const client = new OpenAI({
    apiKey,
  });

  try {
    const {
      task,
      subject,
      taskType,
      dueDate,
      estimatedHours,
      heaviness,
      alreadyDone,
      stuckOn,
    } = request.body;

    if (!task || !estimatedHours || !dueDate) {
      return response.status(400).json({
        error: "Task, estimatedHours, and dueDate are required.",
      });
    }

    const aiResponse = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "You are IPlan, an academic planning assistant for overwhelmed students. Turn stressful school tasks into realistic, specific, emotionally manageable study plans. Return only valid JSON.",
        },
        {
          role: "user",
          content: `
Create a detailed study breakdown.

Task: ${task}
Subject: ${subject || "Not specified"}
Task type: ${taskType || "Not specified"}
Due date: ${dueDate}
Estimated total hours: ${estimatedHours}
Emotional heaviness from 1 to 5: ${heaviness}
Already done: ${alreadyDone || "Nothing specified"}
Stuck on: ${stuckOn || "Nothing specified"}

Return only valid JSON matching this exact shape:
{
  "taskTitle": "string",
  "overallStrategy": "string",
  "nextBestAction": "string",
  "milestones": ["string"],
  "sessions": [
    {
      "title": "string",
      "durationMinutes": 30,
      "duration": "30 minutes",
      "focus": "string",
      "steps": ["string"],
      "successCondition": "string",
      "dontWorryAbout": "string"
    }
  ],
  "recoveryPlan": "string"
}

Make milestones specific to the actual task, not generic.
Make sessions add up approximately to the estimated total hours.
If emotional heaviness is high, make the first session smaller and easier.
`,
        },
      ],
    });

    const rawText = aiResponse.output_text;
    const breakdown = JSON.parse(rawText);

    return response.status(200).json({
      breakdown,
    });
  } catch (error) {
    console.error("AI breakdown error:", error);

    return response.status(500).json({
      error: "Failed to generate AI breakdown.",
      details: error.message,
    });
  }
}