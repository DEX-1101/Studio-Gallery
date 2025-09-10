

import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import type { GenerateVideoParams, GenerateImageParams, EditImageServiceParams, NanoBananaResultPart, ImageData, EnhancePromptParams } from '../types';

// Helper to get intrinsic image dimensions from a File object
const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            if (!event.target?.result) {
                return reject(new Error("Failed to read file."));
            }
            const img = new Image();
            img.src = event.target.result as string;
            img.onload = () => {
                resolve({ width: img.naturalWidth, height: img.naturalHeight });
            };
            img.onerror = (err) => reject(new Error(`Image load error: ${err}`));
        };
        reader.onerror = (err) => reject(new Error(`File reader error: ${err}`));
    });
};

// Helper to crop a square image back to an original aspect ratio, removing padding.
const cropToOriginalAspectRatio = (
    imageDataUrl: string,
    originalWidth: number,
    originalHeight: number,
    targetDimension: number
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = imageDataUrl;
        img.onload = () => {
            // Re-calculate the dimensions of the content area within the padded square image
            const aspectRatio = originalWidth / originalHeight;
            let contentWidth, contentHeight;
            if (aspectRatio > 1) { // Landscape
                contentWidth = targetDimension;
                contentHeight = targetDimension / aspectRatio;
            } else { // Portrait or square
                contentHeight = targetDimension;
                contentWidth = targetDimension * aspectRatio;
            }

            // Calculate the top-left offset of the content area
            const x = (targetDimension - contentWidth) / 2;
            const y = (targetDimension - contentHeight) / 2;

            const canvas = document.createElement('canvas');
            // Set canvas to the final, un-padded dimensions
            canvas.width = contentWidth;
            canvas.height = contentHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context for cropping.'));
            }
            
            // Draw the relevant part of the square generated image onto the new, smaller canvas
            ctx.drawImage(img, x, y, contentWidth, contentHeight, 0, 0, contentWidth, contentHeight);
            
            // Return the data URL of the newly cropped image
            resolve(canvas.toDataURL('image/jpeg', 0.95));
        };
        img.onerror = (err) => reject(new Error(`Image load error during cropping: ${err}`));
    });
};


// New resize logic inspired by the reference to enforce a consistent aspect ratio without cropping.
// It resizes the image to fit within a square and adds padding, ensuring a consistent
// input size for the AI model, which enhances stability.
const resizeImage = (file: File, targetDimension: number): Promise<File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            if (!event.target?.result) {
                return reject(new Error("Failed to read file."));
            }
            const img = new Image();
            img.src = event.target.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = targetDimension;
                canvas.height = targetDimension;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context.'));
                }

                // Fill the canvas with a neutral background to avoid transparency issues
                // and ensure a consistent input format for the model.
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, targetDimension, targetDimension);

                // Calculate new dimensions to fit inside the square canvas while maintaining aspect ratio
                const aspectRatio = img.width / img.height;
                let newWidth, newHeight;

                if (aspectRatio > 1) { // Landscape image
                    newWidth = targetDimension;
                    newHeight = targetDimension / aspectRatio;
                } else { // Portrait or square image
                    newHeight = targetDimension;
                    newWidth = targetDimension * aspectRatio;
                }

                // Calculate position to center the image on the canvas
                const x = (targetDimension - newWidth) / 2;
                const y = (targetDimension - newHeight) / 2;
                
                // Draw the resized image onto the centered position
                ctx.drawImage(img, x, y, newWidth, newHeight);

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(new File([blob], file.name, {
                            type: 'image/jpeg', // Force jpeg to handle padding color consistently
                            lastModified: Date.now()
                        }));
                    } else {
                        reject(new Error('Canvas to Blob conversion failed.'));
                    }
                }, 'image/jpeg', 0.95);
            };
            img.onerror = (err) => reject(new Error(`Image load error: ${err}`));
        };
        reader.onerror = (err) => reject(new Error(`File reader error: ${err}`));
    });
};

// Helper function to convert a File object to a Gemini API Part
const fileToPart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    
    const mimeType = mimeMatch[1];
    const data = arr[1];
    return { inlineData: { mimeType, data } };
};

// Helper to convert File to a data URL string
const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

// Helper to draw a marker on an image and return a new File object
const markImage = async (
    paddedSquareFile: File, 
    position: { xPercent: number; yPercent: number; },
    originalDimensions: { originalWidth: number; originalHeight: number; }
): Promise<File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(paddedSquareFile);
        reader.onload = (event) => {
            if (!event.target?.result) {
                return reject(new Error("Failed to read file for marking."));
            }
            const img = new Image();
            img.src = event.target.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const targetDimension = canvas.width;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context for marking.'));
                }

                // Draw the original (padded) image
                ctx.drawImage(img, 0, 0);

                // Recalculate the content area's dimensions and offset within the padded square canvas.
                // This is crucial to translate the content-relative percentages to the padded canvas coordinates.
                const { originalWidth, originalHeight } = originalDimensions;
                const aspectRatio = originalWidth / originalHeight;
                let contentWidth, contentHeight;

                if (aspectRatio > 1) { // Landscape
                    contentWidth = targetDimension;
                    contentHeight = targetDimension / aspectRatio;
                } else { // Portrait or square
                    contentHeight = targetDimension;
                    contentWidth = targetDimension * aspectRatio;
                }
                
                const offsetX = (targetDimension - contentWidth) / 2;
                const offsetY = (targetDimension - contentHeight) / 2;

                // Calculate the marker's coordinates relative to the actual image content
                const markerXInContent = (position.xPercent / 100) * contentWidth;
                const markerYInContent = (position.yPercent / 100) * contentHeight;

                // The final position on the canvas is the content's offset plus the relative position
                const finalMarkerX = offsetX + markerXInContent;
                const finalMarkerY = offsetY + markerYInContent;
                
                // Draw a medium red dot as the marker
                const markerRadius = Math.max(2, Math.min(canvas.width, canvas.height) * 0.015);
                ctx.beginPath();
                ctx.arc(finalMarkerX, finalMarkerY, markerRadius, 0, 2 * Math.PI, false);
                ctx.fillStyle = 'red';
                ctx.fill();

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(new File([blob], `marked-${paddedSquareFile.name}`, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        }));
                    } else {
                        reject(new Error('Canvas to Blob conversion failed during marking.'));
                    }
                }, 'image/jpeg', 0.95);
            };
            img.onerror = (err) => reject(new Error(`Image load error during marking: ${err}`));
        };
        reader.onerror = (err) => reject(new Error(`File reader error during marking: ${err}`));
    });
};

/**
 * Generates a composite image using a multi-modal AI model.
 * The model takes a product image, a scene image, and a text prompt
 * to generate a new image with the product placed in the scene.
 * @param objectImage The file for the object to be placed.
 * @param environmentImage The file for the background environment.
 * @param dropPosition The relative x/y coordinates (0-100) where the product was dropped.
 * @param apiKey The Google AI API key.
 * @param onProgress Callback function to report progress.
 * @param signal AbortSignal to cancel the operation.
 * @returns A promise that resolves to an object containing the base64 data URL of the generated image and the debug image.
 */
export const generateCompositeImage = async ({
    objectImage,
    environmentImage,
    dropPosition,
    apiKey,
    onProgress,
    signal,
}: {
    objectImage: File,
    environmentImage: File,
    dropPosition: { xPercent: number; yPercent: number; },
    apiKey: string;
    onProgress: (step: 'resizing' | 'marking' | 'describing' | 'composing' | 'cropping' | 'done') => void;
    signal?: AbortSignal;
}): Promise<{ finalImageUrl: string; debugImageUrl: string; finalPrompt: string; }> => {
  const ai = new GoogleGenAI({ apiKey });
  const checkSignal = () => { if (signal?.aborted) throw new DOMException('Aborted by user', 'AbortError'); };

  checkSignal();
  const { width: originalWidth, height: originalHeight } = await getImageDimensions(environmentImage);
  
  const MAX_DIMENSION = 1024;
  
  checkSignal();
  onProgress('resizing');
  const resizedObjectImage = await resizeImage(objectImage, MAX_DIMENSION);
  const resizedEnvironmentImage = await resizeImage(environmentImage, MAX_DIMENSION);

  checkSignal();
  onProgress('marking');
  const markedResizedEnvironmentImage = await markImage(resizedEnvironmentImage, dropPosition, { originalWidth, originalHeight });
  const debugImageUrl = await fileToDataUrl(markedResizedEnvironmentImage);

  checkSignal();
  onProgress('describing');
  const markedEnvironmentImagePart = await fileToPart(markedResizedEnvironmentImage);

  const descriptionPrompt = `
You are an expert scene analyst. I will provide you with an image that has a red dot on it.
Your task is to provide a very dense, semantic description of what is at the exact location of the marker.
Be specific about surfaces, objects, and spatial relationships. This description will be used to guide another AI in placing a new object.

Example semantic descriptions:
- "The product location is on the dark grey fabric of the sofa cushion, in the middle section, slightly to the left of the white throw pillow."
- "The product location is on the light-colored wooden floor, in the patch of sunlight coming from the window, about a foot away from the leg of the brown leather armchair."
- "The product location is on the white marble countertop, just to the right of the stainless steel sink and behind the green potted plant."

On top of the semantic description above, give a rough relative-to-image description.

Example relative-to-image descriptions:
- "The product location is about 10% away from the bottom-left of the image."
- "The product location is about 20% away from the right of the image."

Provide only the two descriptions concatenated in a few sentences.
`;
  
  let semanticLocationDescription = '';
  try {
    const descriptionResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: descriptionPrompt }, markedEnvironmentImagePart] }
    });
    semanticLocationDescription = descriptionResponse.text;
  } catch (error) {
    console.error('Failed to generate semantic location description:', error);
    semanticLocationDescription = `at the specified location.`;
  }

  checkSignal();
  onProgress('composing');
  
  const objectImagePart = await fileToPart(resizedObjectImage);
  const cleanEnvironmentImagePart = await fileToPart(resizedEnvironmentImage);
  
  const prompt = `
**Role:**
You are a visual composition expert. Your task is to take a 'Input' image and seamlessly integrate it into a 'scene' image, adjusting for perspective, lighting, and scale.

**Specifications:**
-   **Product to add:**
    The first image provided. It may be surrounded by black padding or background, which you should ignore and treat as transparent and only keep the product.
-   **Scene to use:**
    The second image provided. It may also be surrounded by black padding, which you should ignore.
-   **Placement Instruction (Crucial):**
    -   You must place the product at the location described below exactly. You should only place the product once. Use this dense, semantic description to find the exact spot in the scene.
    -   **Product location Description:** "${semanticLocationDescription}"
-   **Final Image Requirements:**
    -   The output image's style, lighting, shadows, reflections, and camera perspective must exactly match the original scene.
    -   Do not just copy and paste the product. You must intelligently re-render it to fit the context. Adjust the product's perspective and orientation to its most natural position, scale it appropriately, and ensure it casts realistic shadows according to the scene's light sources.
    -   The product must have proportional realism. For example, a lamp product can't be bigger than a sofa in scene.
    -   You must not return the original scene image without product placement. The product must be always present in the composite image.

The output should ONLY be the final, composed image. Do not add any text or explanation.
`;

  const textPart = { text: prompt };
  
  checkSignal();
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image-preview',
    contents: { parts: [objectImagePart, cleanEnvironmentImagePart, textPart] },
    config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });
  
  checkSignal();
  const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

  if (imagePartFromResponse?.inlineData) {
    const { mimeType, data } = imagePartFromResponse.inlineData;
    const generatedSquareImageUrl = `data:${mimeType};base64,${data}`;
    
    onProgress('cropping');
    const finalImageUrl = await cropToOriginalAspectRatio(
        generatedSquareImageUrl,
        originalWidth,
        originalHeight,
        MAX_DIMENSION
    );
    
    onProgress('done');
    return { finalImageUrl, debugImageUrl, finalPrompt: prompt };
  }

  console.error("Model response did not contain an image part.", response);
  throw new Error("The AI model did not return an image. Please try again.");
};


const handleApiError = (error: unknown): never => {
    console.error("Error during API call:", error);
    const rawMessage = error instanceof Error ? error.message : JSON.stringify(error);
    
    if (rawMessage.includes('429') || rawMessage.includes('RESOURCE_EXHAUSTED')) {
        throw new Error("API quota exceeded. You have made too many requests or your free trial has ended. Please check your Google AI plan and billing details.");
    }

    if ((error as any)?.error?.status === 'NOT_FOUND' || rawMessage.includes("NOT_FOUND")) {
        throw new Error("The video generation operation could not be found. It may have expired or is invalid. This can happen if an invalid model is selected. Please try again.");
    }
    
    throw new Error(`An error occurred: ${rawMessage}`);
};

export const generateVideoFromPrompt = async ({ prompt, model, image, apiKey, aspectRatio, signal, durationSecs, numberOfVideos, resolution, generatePeople }: GenerateVideoParams): Promise<string> => {
  if (!apiKey) {
    throw new Error("API Key is not configured.");
  }
  if (signal?.aborted) throw new DOMException('Aborted by user', 'AbortError');

  const ai = new GoogleGenAI({ apiKey });

  const requestPayload: any = {
    model,
    prompt,
    config: {
      numberOfVideos: numberOfVideos || 1,
    },
  };

  if ((model.startsWith('veo-')) && aspectRatio) {
    requestPayload.config.aspectRatio = aspectRatio;
  }
  
  if (durationSecs) {
    requestPayload.config.durationSecs = durationSecs;
  }

  if (generatePeople !== undefined) {
      requestPayload.config.generatePeople = generatePeople;
  }

  if (resolution && aspectRatio === '16:9') {
      requestPayload.config.resolution = resolution === '1080p' ? 'SDR_1080P' : 'SDR_720P';
  }

  if (image) {
    requestPayload.image = {
      imageBytes: image.base64,
      mimeType: image.mimeType,
    };
  }
  
  try {
    let operation = await ai.models.generateVideos(requestPayload);
  
    while (!operation.done) {
      if (signal?.aborted) throw new DOMException('Aborted by user', 'AbortError');
      await new Promise(resolve => setTimeout(resolve, 10000));
      if (signal?.aborted) throw new DOMException('Aborted by user', 'AbortError');
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    if (operation.error) {
        console.error("Video generation operation failed:", operation.error);
        const errorMessage = `Video generation failed. Code: ${(operation.error as any).code || 'N/A'}. Message: ${(operation.error as any).message || 'No message provided.'}`;
        throw new Error(errorMessage);
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

    if (!downloadLink) {
      console.error("Video generation finished but response is malformed or missing video URI:", JSON.stringify(operation.response, null, 2));
      throw new Error("Video generation completed, but no download link was found. The model may have rejected the prompt due to safety policies, or an unknown API error occurred.");
    }
    
    return downloadLink;
  } catch (error) {
    if (signal?.aborted) throw error;
    handleApiError(error);
  }
};


export const generateImagesFromPrompt = async ({ prompt, model, numberOfImages, aspectRatio, resolution, apiKey, outputMimeType, signal }: GenerateImageParams): Promise<string[]> => {
  if (!apiKey) {
    throw new Error("API Key is not configured.");
  }
  if (signal?.aborted) throw new DOMException('Aborted by user', 'AbortError');

  const ai = new GoogleGenAI({ apiKey });

  const config: any = {
    numberOfImages,
    outputMimeType,
    aspectRatio,
  };

  try {
    const response = await ai.models.generateImages({
        model,
        prompt,
        config,
    });
    
    if (signal?.aborted) throw new DOMException('Aborted by user', 'AbortError');

    return response.generatedImages.map(img => `data:${outputMimeType};base64,${img.image.imageBytes}`);

  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    if (signal?.aborted) throw new DOMException('Aborted by user', 'AbortError');
    handleApiError(error);
  }
};

export const editImageWithNanoBanana = async ({ prompt, images, apiKey, model, signal }: EditImageServiceParams): Promise<NanoBananaResultPart[]> => {
  if (!apiKey) {
    throw new Error("API Key is not configured.");
  }
  if (!images || images.length === 0) {
    throw new Error("At least one image is required for editing.");
  }
  if (signal?.aborted) throw new DOMException('Aborted by user', 'AbortError');

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const imageParts = images.map((image: ImageData) => ({
      inlineData: {
        data: image.base64,
        mimeType: image.mimeType,
      },
    }));

    const textPart = { text: prompt };

    const contents = {
      parts: [...imageParts, textPart],
    };

    const response = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    if (signal?.aborted) throw new DOMException('Aborted by user', 'AbortError');

    const parts = response.candidates?.[0]?.content?.parts || [];
    
    return parts.map((part): NanoBananaResultPart => {
      const resultPart: NanoBananaResultPart = {};
      if (part.text) {
        resultPart.text = part.text;
      }
      if (part.inlineData) {
        if (!part.inlineData.mimeType) {
          throw new Error("API response for an image part is missing the required 'mimeType' property.");
        }
        resultPart.inlineData = {
          data: part.inlineData.data,
          mimeType: part.inlineData.mimeType,
        };
      }
      return resultPart;
    });

  } catch (error) {
    if (signal?.aborted) throw error;
    handleApiError(error);
  }
};

const IMAGE_GENERATE_PROMPT_ENHANCEMENT_INSTRUCTION = `You are a creative assistant that enhances user prompts for an image generation AI. Your goal is to rewrite the user's prompt to be more descriptive, vivid, and imaginative, focusing on visual details like style, composition, lighting, and mood. The output should be ONLY the enhanced prompt, without any extra text, explanation, or quotation marks.`;

export const VIDEO_PROMPT_ENHANCEMENT_INSTRUCTION = `You are a creative assistant that enhances user prompts for a video generation AI. Your goal is to rewrite the user's prompt to describe a cinematic and realistic video scene. Make it more descriptive, vivid, and imaginative. Add details about camera angles, lighting, motion, and mood to make it suitable for video generation. The output should be ONLY the enhanced prompt, without any extra text, explanation, or quotation marks.`;

export const enhancePrompt = async ({ prompt, apiKey, instruction, signal }: EnhancePromptParams): Promise<string> => {
    if (!apiKey) {
        throw new Error("API Key is not configured.");
    }
    if (!prompt) {
        return "";
    }
    if (signal?.aborted) throw new DOMException('Aborted by user', 'AbortError');

    const ai = new GoogleGenAI({ apiKey });

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: instruction || IMAGE_GENERATE_PROMPT_ENHANCEMENT_INSTRUCTION,
                thinkingConfig: { thinkingBudget: 0 }
            },
        });

        if (signal?.aborted) throw new DOMException('Aborted by user', 'AbortError');
        
        const enhancedPrompt = response.text.trim();
        return enhancedPrompt.replace(/^"(.*)"$/, '$1');

    } catch (error) {
        if (signal?.aborted) throw error;
        handleApiError(error);
    }
};