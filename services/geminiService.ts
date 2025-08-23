import { GoogleGenAI } from "@google/genai";
import type { GenerateVideoServiceParams } from '../types';

export const generateVideoFromPrompt = async ({ prompt, model, image, onProgress, apiKey, loadingMessages }: GenerateVideoServiceParams): Promise<string> => {
  if (!apiKey) {
    throw new Error("API Key is not provided.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const requestPayload: any = {
    model,
    prompt,
    config: {
      numberOfVideos: 1,
    },
  };

  if (image) {
    requestPayload.image = {
      imageBytes: image.base64,
      mimeType: image.mimeType,
    };
  }
  
  onProgress("Sending request to the VEO model...");
  let operation = await ai.models.generateVideos(requestPayload);
  
  onProgress("Operation started. This may take several minutes...");

  let messageIndex = 0;
  const intervalId = setInterval(() => {
    onProgress(loadingMessages[messageIndex]);
    messageIndex = (messageIndex + 1) % loadingMessages.length;
  }, 8000);

  try {
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

    if (!downloadLink) {
      throw new Error("Video generation completed, but no download link was found.");
    }

    onProgress("Video generated successfully!");
    // The final URL requires the API key for access
    return `${downloadLink}&key=${apiKey}`;
  } catch (error) {
      console.error("Error during video generation polling:", error);
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      if (error?.error?.status === 'NOT_FOUND' || errorMessage.includes("NOT_FOUND")) {
          throw new Error("The video generation operation could not be found. It may have expired or is invalid. This can happen if an invalid model is selected. Please try again.");
      }
      throw new Error(`An error occurred while processing the video: ${errorMessage}`);
  } finally {
      clearInterval(intervalId);
  }
};