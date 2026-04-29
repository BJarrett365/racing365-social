# Runway `text_to_image` API (reference)

The RunwayML **SDK** calls the same HTTP API your dev portal documents:

| Item | Value |
|------|--------|
| **Method** | `POST` |
| **Path** | `/v1/text_to_image` |
| **Base URL** | `https://api.dev.runwayml.com` (default; overridable via SDK `baseURL`) |
| **Auth** | `Authorization: Bearer <RUNWAYML_API_SECRET>` |
| **Version** | `X-Runway-Version: 2024-11-06` (must match [Runway API docs](https://docs.dev.runwayml.com)) |

This package uses **`client.textToImage.create(params)`**, which issues that request, returns a **task id**, then **`waitForTaskOutput()`** polls `/v1/tasks/{id}` until `SUCCEEDED` or failure.

**Not** text-to-video: there is no video file in the response — only **image URLs** in `task.output[]` (temporary; download into your own storage for video/social pipelines).
