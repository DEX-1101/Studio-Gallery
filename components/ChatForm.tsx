import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import { useAutoResizeTextarea } from '../hooks/useAutoResizeTextarea';
import { CustomModelSelector } from './CustomModelSelector';
import { ClearInputIcon, SendIcon, SparklesIcon, ChevronDownIcon, PaperclipIcon, CloseIcon, SpinnerIcon, CancelGenerationIcon, GearIcon, GoogleIcon } from './IconComponents';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { AspectRatio, GenerateImageParams } from '../types';
import { generateImagesFromPrompt } from '../services/geminiService';

const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleTimeString(navigator.language, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
};

const formatDuration = (ms: number) => {
    return `(${(ms / 1000).toFixed(1)}s)`;
};

interface ChatMessage {
    role: 'user' | 'model';
    content: string;
    timestamp: number;
    duration?: number;
    image?: string; // data URL for preview in UI
    generatedImages?: string[]; // data URLs for generated images
    groundingChunks?: { web: { uri: string; title: string } }[];
}

interface ChatFormProps {
    t: (key: string) => string;
    apiKey: string;
    imageGenModel: string;
    imageGenAspectRatio: AspectRatio;
    generateImages: typeof generateImagesFromPrompt;
}

const chatModels = [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
];

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    const sanitizedHtml = useMemo(() => {
        // Collapse 2 or more newlines (with optional whitespace) into a double newline for a paragraph break
        const cleanedContent = content.replace(/(\s*\n\s*){2,}/g, '\n\n');
        const rawHtml = marked.parse(cleanedContent, { gfm: true, breaks: true });
        return DOMPurify.sanitize(rawHtml as string);
    }, [content]);

    return (
        <div 
            className="prose-chat whitespace-pre-wrap font-sans break-words flex-grow min-w-0"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
    );
};

const fileToPart = async (file: File) => {
    const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
    return {
        inlineData: {
            mimeType: file.type,
            data: base64,
        },
    };
};

const IMAGE_GEN_KEYWORDS = ['generate', 'create', 'draw', 'make an image', 'show me a picture of'];

export const ChatForm: React.FC<ChatFormProps> = ({ t, apiKey, imageGenModel, imageGenAspectRatio, generateImages }) => {
    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [attachedImage, setAttachedImage] = useState<{ file: File, preview: string } | null>(null);
    const [model, setModel] = useState('gemini-2.5-flash');
    const [isLoading, setIsLoading] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [abortController, setAbortController] = useState<AbortController | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [systemInstruction, setSystemInstruction] = useState('');
    const [temperature, setTemperature] = useState(0.9);
    const [topK, setTopK] = useState(40);
    const [topP, setTopP] = useState(0.95);
    const [maxOutputTokens, setMaxOutputTokens] = useState('');
    const [useGoogleSearch, setUseGoogleSearch] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const systemInstructionRef = useRef<HTMLTextAreaElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    useAutoResizeTextarea(textareaRef, input);
    useAutoResizeTextarea(systemInstructionRef, systemInstruction);
    
    const isChatting = messages.length > 0;

    useEffect(() => {
        const container = chatContainerRef.current;
        if (container) {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth',
            });
        }
    }, [messages, isLoading]);
    
    useEffect(() => {
        handleClearChat();
    }, [model, apiKey, useGoogleSearch]);

    useEffect(() => {
        if (isChatting) return;
        setChat(null);
    }, [systemInstruction, temperature, topK, topP, maxOutputTokens]);

    const handleClearChat = () => {
        setChat(null);
        setMessages([]);
        setError(null);
        setIsLoading(false);
        setIsCancelling(false);
        if (abortController) {
            abortController.abort();
        }
        setAbortController(null);
        setAttachedImage(null);
    };

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setError(null);
            const file = event.target.files?.[0];
            if (!file) return;

            if (!ACCEPTED_TYPES.includes(file.type)) {
                setError(t('invalidFileTypeError'));
                return;
            }
            if (file.size > MAX_SIZE_BYTES) {
                setError(t('fileTooLargeError'));
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setAttachedImage({
                    file: file,
                    preview: reader.result as string,
                });
            };
            reader.readAsDataURL(file);

        } finally {
            if (event.target) event.target.value = '';
        }
    };

    const handleRemoveImage = () => {
        setAttachedImage(null);
    };

    const handleCancelGeneration = () => {
        if (abortController) {
            setIsCancelling(true);
            abortController.abort("User cancelled generation");
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!input.trim() && !attachedImage) || isLoading) return;

        const controller = new AbortController();
        setAbortController(controller);

        const userMessageContent = input;
        const userImage = attachedImage;
        const newUserMessage: ChatMessage = { role: 'user', content: userMessageContent, image: userImage?.preview, timestamp: Date.now() };
        
        setInput('');
        setAttachedImage(null);
        setIsLoading(true);
        setIsCancelling(false);
        setError(null);
        setMessages(prev => [...prev, newUserMessage]);
        
        const startTime = Date.now();

        const isImageGenRequest = !userImage && IMAGE_GEN_KEYWORDS.some(keyword => userMessageContent.toLowerCase().includes(keyword));

        if (isImageGenRequest) {
            try {
                setMessages(prev => [...prev, { role: 'model', content: t('generatingImageMessage'), timestamp: Date.now() }]);
                const images = await generateImages({
                    apiKey,
                    prompt: userMessageContent,
                    model: imageGenModel,
                    aspectRatio: imageGenAspectRatio,
                    numberOfImages: 1,
                    resolution: '1k',
                    outputMimeType: 'image/jpeg',
                    signal: controller.signal,
                });
                const duration = Date.now() - startTime;
                setMessages(prev => [...prev, { role: 'model', content: '', generatedImages: images, timestamp: Date.now(), duration }]);
            } catch (err) {
                 const duration = Date.now() - startTime;
                 if (err instanceof Error && err.name === 'AbortError') {
                    setMessages(prev => [...prev, { role: 'model', content: t('generationCancelled'), timestamp: Date.now(), duration }]);
                } else {
                    const errorMessage = err instanceof Error ? err.message : t('unknownError');
                    setMessages(prev => [...prev, { role: 'model', content: `Sorry, I couldn't create that image. Error: ${errorMessage}`, timestamp: Date.now(), duration }]);
                }
            } finally {
                setIsLoading(false);
                setIsCancelling(false);
                setAbortController(null);
            }
            return;
        }

        setMessages(prev => [...prev, { role: 'model', content: '', timestamp: Date.now() }]);
        try {
            const ai = new GoogleGenAI({ apiKey });
            // FIX: Ensure message parts conform to the `Part` type by wrapping strings in a `text` object.
            const messageParts: ({ text: string; } | { inlineData: { mimeType: string; data: string; }; })[] = [];
            if (userImage) messageParts.push(await fileToPart(userImage.file));
            if (userMessageContent) messageParts.push({ text: userMessageContent });

            const config: any = { temperature, topK, topP };
            const finalSystemInstruction = systemInstruction.trim() ? systemInstruction.trim() : t('defaultSystemInstruction');
            if (finalSystemInstruction) config.systemInstruction = finalSystemInstruction;
            const maxTokens = parseInt(maxOutputTokens, 10);
            if (!isNaN(maxTokens) && maxTokens > 0) {
                config.maxOutputTokens = maxTokens;
                if (model === 'gemini-2.5-flash') {
                    config.thinkingConfig = { thinkingBudget: Math.min(100, Math.floor(maxTokens * 0.5)) };
                }
            }

            let responseStream;

            if (useGoogleSearch) {
                // For Google Search, use the one-shot API without chat history.
                // This is a simplification because chat history with images is not stored in a reconstructable way.
                // It also aligns with search-grounding being for specific, up-to-date queries.
                config.tools = [{ googleSearch: {} }];

                responseStream = await ai.models.generateContentStream({
                    model,
                    contents: { role: 'user', parts: messageParts },
                    config,
                });
            } else {
                // For regular chat, use the Chat API to maintain conversation history.
                let currentChat = chat;
                if (!currentChat) {
                    currentChat = ai.chats.create({ model, config });
                    setChat(currentChat);
                }
                responseStream = await currentChat.sendMessageStream({ message: messageParts });
            }

            const aggregatedGroundingChunks = new Map<string, { web: { uri: string; title: string } }>();
            
            for await (const chunk of responseStream) {
                if (controller.signal.aborted) {
                    console.log("Stream processing cancelled by user.");
                    break;
                }
                const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
                if (groundingMetadata?.groundingChunks) {
                    for (const groundingChunk of groundingMetadata.groundingChunks) {
                        if (groundingChunk.web?.uri) {
                            aggregatedGroundingChunks.set(groundingChunk.web.uri, {
                                web: {
                                    uri: groundingChunk.web.uri,
                                    title: groundingChunk.web.title ?? ''
                                }
                            });
                        }
                    }
                }
                
                const chunkText = chunk.text;
                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMsg = newMessages[newMessages.length - 1];
                    if (lastMsg && lastMsg.role === 'model') {
                        lastMsg.content += chunkText;
                        if (aggregatedGroundingChunks.size > 0) {
                            lastMsg.groundingChunks = Array.from(aggregatedGroundingChunks.values());
                        }
                    }
                    return newMessages;
                });
            }
            
            const duration = Date.now() - startTime;
            
            setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage && lastMessage.role === 'model') {
                    newMessages[newMessages.length - 1] = {
                        ...lastMessage,
                        content: lastMessage.content.trim(),
                        duration: duration,
                    };
                }
                return newMessages;
            });

        } catch (err) {
            const duration = Date.now() - startTime;
            if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) {
                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMsg = newMessages[newMessages.length - 1];
                    if (lastMsg && lastMsg.role === 'model') {
                        lastMsg.content = (lastMsg.content.trim() + `\n\n*${t('generationCancelled')}*`).trim();
                        lastMsg.duration = duration;
                    }
                    return newMessages;
                });
            } else {
                const errorMessage = err instanceof Error ? err.message : t('unknownError');
                setError(errorMessage);
                setMessages(prev => prev.slice(0, -1)); // Remove empty model message
            }
        } finally {
            setIsLoading(false);
            setIsCancelling(false);
            setAbortController(null);
        }
    };
    
    const chatModelOptions = chatModels.map(m => ({
        id: m.id,
        name: m.name,
        description: t(`modelDescription.${m.id.replace(/[\.\-]/g, '_')}`),
        icon: <SparklesIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
    }));

    return (
        <div className="w-full bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col h-full">
            <div className="flex-shrink-0 flex items-center gap-2 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex-grow">
                    <CustomModelSelector
                        label=""
                        options={chatModelOptions}
                        value={model}
                        onChange={setModel}
                        disabled={isChatting}
                        t={t}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        className={`p-2 rounded-full transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 ${isSettingsOpen ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
                        title={t('tooltips.toggleAdvancedSettings')}
                    >
                        <GearIcon className="h-5 w-5" />
                    </button>
                    <button
                        type="button"
                        onClick={handleClearChat}
                        disabled={isLoading || messages.length === 0}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                        title={t('tooltips.clearChat')}
                    >
                        <ClearInputIcon className="h-4 w-4" />
                        <span>{t('clearChatButton')}</span>
                    </button>
                </div>
            </div>

            {isSettingsOpen && (
                <div className="flex-shrink-0 grid grid-cols-1 md:grid-cols-2 gap-4 my-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 animate-fade-in-scale-up">
                    <div className="col-span-1 md:col-span-2">
                        <label htmlFor="system-instruction" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('systemInstruction')}</label>
                        <textarea
                            id="system-instruction"
                            ref={systemInstructionRef}
                            value={systemInstruction}
                            onChange={(e) => setSystemInstruction(e.target.value)}
                            placeholder={t('systemInstructionPlaceholder')}
                            rows={2}
                            disabled={isChatting}
                            className="w-full text-sm bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-500 rounded-md p-2 focus:ring-1 focus:ring-brand-primary focus:border-brand-primary disabled:opacity-60 resize-none overflow-y-hidden"
                            title={t('tooltips.systemInstruction')}
                        />
                    </div>
                    <div>
                        <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('temperature')} ({temperature.toFixed(2)})</label>
                        <input type="range" id="temperature" min="0" max="1" step="0.01" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} disabled={isChatting} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 disabled:opacity-60" title={t('tooltips.temperature')} />
                    </div>
                    <div>
                        <label htmlFor="top-p" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('topP')} ({topP.toFixed(2)})</label>
                        <input type="range" id="top-p" min="0" max="1" step="0.01" value={topP} onChange={(e) => setTopP(parseFloat(e.target.value))} disabled={isChatting} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 disabled:opacity-60" title={t('tooltips.topP')} />
                    </div>
                    <div>
                        <label htmlFor="top-k" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('topK')}</label>
                        <input type="number" id="top-k" value={topK} onChange={(e) => setTopK(parseInt(e.target.value, 10))} disabled={isChatting} className="w-full text-sm bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-500 rounded-md p-2 focus:ring-1 focus:ring-brand-primary focus:border-brand-primary disabled:opacity-60" title={t('tooltips.topK')} />
                    </div>
                    <div>
                        <label htmlFor="max-tokens" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('maxOutputTokens')}</label>
                        <input type="number" id="max-tokens" placeholder="Default" value={maxOutputTokens} onChange={(e) => setMaxOutputTokens(e.target.value)} disabled={isChatting} className="w-full text-sm bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-500 rounded-md p-2 focus:ring-1 focus:ring-brand-primary focus:border-brand-primary disabled:opacity-60" title={t('tooltips.maxOutputTokens')} />
                    </div>
                    <div className="col-span-1 md:col-span-2 flex items-center gap-2">
                        <input type="checkbox" id="google-search" checked={useGoogleSearch} onChange={(e) => setUseGoogleSearch(e.target.checked)} disabled={isChatting} className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary disabled:opacity-60" title={t('tooltips.googleSearch')} />
                        <label htmlFor="google-search" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('googleSearch')}</label>
                    </div>
                </div>
            )}

            <div ref={chatContainerRef} className="flex-grow overflow-y-auto custom-scrollbar -mr-4 pr-4 my-4 space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex gap-3 animate-fade-in-scale-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`
                            max-w-xl p-3 rounded-2xl flex flex-col
                            ${msg.role === 'user'
                                ? 'bg-blue-500 text-white rounded-br-none'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
                            }
                        `}>
                            {msg.image && (
                                <img src={msg.image} alt="Attached content" className="max-w-xs max-h-48 rounded-lg mb-2" />
                            )}
                             {msg.generatedImages && (
                                <div className="grid grid-cols-1 gap-2 mb-2">
                                    {msg.generatedImages.map((url, i) => (
                                        <img key={i} src={url} alt={`Generated image ${i}`} className="max-w-xs max-h-64 rounded-lg" />
                                    ))}
                                </div>
                            )}

                            {isLoading && index === messages.length - 1 && msg.content.length === 0 ? (
                                <div className="flex items-center p-2">
                                    <span className="font-semibold animate-pulse">Thinking...</span>
                                </div>
                            ) : (
                                <MarkdownRenderer content={msg.content} />
                            )}
                            
                            {msg.groundingChunks && msg.groundingChunks.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                                    <h4 className="text-xs font-semibold mb-1 opacity-80">Sources:</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {msg.groundingChunks.map((chunk, i) => (
                                            <a key={i} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-xs bg-gray-300 dark:bg-gray-600 px-2 py-1 rounded-md hover:underline truncate max-w-[200px]">
                                                {chunk.web.title || chunk.web.uri}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="flex-shrink-0 mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
                {error && <p className="text-sm text-center text-brand-danger mb-2 animate-fade-in">{error}</p>}
                
                {attachedImage && (
                    <div className="relative inline-block mb-2 animate-fade-in-scale-up">
                        <img src={attachedImage.preview} alt="Attachment preview" className="h-20 w-20 object-cover rounded-lg" />
                        <button onClick={handleRemoveImage} className="absolute -top-2 -right-2 bg-gray-700 text-white rounded-full p-0.5" title={t('tooltips.removeAttachedImage')}>
                            <CloseIcon className="h-4 w-4" />
                        </button>
                    </div>
                )}
                
                <form onSubmit={handleSendMessage} className="relative">
                    <div className="
                        flex items-center gap-1 p-1 
                        bg-gray-100 dark:bg-gray-900/50 
                        border border-gray-300 dark:border-gray-600 rounded-xl 
                        focus-within:ring-2 focus-within:ring-brand-primary transition-shadow
                    ">
                        <div className="flex-shrink-0 flex items-center gap-1">
                             <button
                                type="button"
                                onClick={() => imageInputRef.current?.click()}
                                disabled={isLoading}
                                className="p-1 text-gray-500 hover:text-brand-primary dark:text-gray-400 dark:hover:text-brand-primary rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                title={t('tooltips.attachImage')}
                            >
                                <PaperclipIcon className="h-5 w-5" />
                            </button>
                             <input type="file" ref={imageInputRef} onChange={handleImageChange} accept={ACCEPTED_TYPES.join(',')} className="hidden" />

                            <button
                                type="button"
                                onClick={() => setUseGoogleSearch(s => !s)}
                                disabled={isLoading || isChatting}
                                className={`p-1 rounded-full transition-colors ${
                                    useGoogleSearch
                                    ? 'text-white bg-brand-primary'
                                    : 'text-gray-500 hover:text-brand-primary dark:text-gray-400 dark:hover:text-brand-primary hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                                title={t('tooltips.googleSearch')}
                            >
                                <GoogleIcon className="h-5 w-5" />
                            </button>
                        </div>

                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(e as any);
                                }
                            }}
                            placeholder={t('chatPlaceholder')}
                            rows={1}
                            className="flex-grow w-full bg-transparent py-1.5 px-2 text-base resize-none border-none focus:ring-0 outline-none placeholder-gray-500 dark:placeholder-gray-400 text-gray-800 dark:text-gray-200"
                            disabled={isLoading}
                        />

                        {isLoading ? (
                            <button
                                type="button"
                                onClick={handleCancelGeneration}
                                className="flex-shrink-0 p-1.5 text-white bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                                title={t('tooltips.cancelGeneration')}
                            >
                                <CancelGenerationIcon className="h-5 w-5" />
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={!input.trim() && !attachedImage}
                                className="flex-shrink-0 p-1.5 text-white bg-brand-primary rounded-full disabled:opacity-50 disabled:cursor-not-allowed transform transition-transform hover:scale-110 active:scale-100"
                                title={t('tooltips.sendMessage')}
                            >
                                <SendIcon />
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};