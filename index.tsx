/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Modality } from "@google/genai";

// Initialize the Google AI SDK
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// DOM Element selectors
const imageUpload = document.getElementById('image-upload') as HTMLInputElement;
const imagePreviewContainer = document.getElementById('image-preview-container') as HTMLElement;
const previewImg = document.getElementById('preview-img') as HTMLImageElement;
const uploadText = document.getElementById('upload-text') as HTMLElement;
const generateBtn = document.getElementById('generate-btn') as HTMLButtonElement;
const opponentSelect = document.getElementById('opponent-select') as HTMLSelectElement;
const uploadSection = document.getElementById('upload-section') as HTMLElement;
const storyboardSection = document.getElementById('storyboard-section') as HTMLElement;
const storyboardGrid = document.getElementById('storyboard-grid') as HTMLElement;
const resetBtn = document.getElementById('reset-btn') as HTMLElement;
const errorMessage = document.getElementById('error-message') as HTMLElement;
const errorText = document.getElementById('error-text') as HTMLElement;

const aiFeaturesSection = document.getElementById('ai-features-section') as HTMLElement;
const generateTextBtn = document.getElementById('generate-text-btn') as HTMLButtonElement;
const commentaryContainer = document.getElementById('commentary-container') as HTMLElement;
const commentaryContent = document.getElementById('commentary-content') as HTMLElement;
const interviewContainer = document.getElementById('interview-container') as HTMLElement;
const interviewContent = document.getElementById('interview-content') as HTMLElement;

let userImageBase64: string | null = null;

const getStoryboardPrompts = (opponentName: string) => [
    {
        title: "The Walkout",
        caption: "The world is watching as you step onto the grandest stage in tennis.",
        prompt: `A tennis player with the likeness of the person in the image, walks onto the blue hard court of Arthur Ashe Stadium at night for the US Open final. The stadium is packed, with flashbulbs going off. ${opponentName} is visible walking alongside. The player has intense focus. Cinematic, hyper-realistic, 8K, dramatic wide shot.`
    },
    {
        title: "The Opening Serve",
        caption: "You unleash the first serve, setting the tone for the battle ahead.",
        prompt: "Action shot, low angle. The tennis player with the likeness of the person in the image is at the peak of their service motion, tossing the ball under stadium lights. Muscles are tensed, face shows determination. Dynamic, motion blur, photo-realistic."
    },
    {
        title: "The Grueling Rally",
        caption: "A punishing baseline exchange. Every point is a war of attrition.",
        prompt: `Tense rally, shot from behind the baseline. ${opponentName} hits a powerful backhand. The player with the likeness of the person in the image is in the foreground, lunging for a forehand, grit on their face. US Open logo visible on the net. High shutter speed photography style.`
    },
    {
        title: "Match Point",
        caption: "The entire match comes down to this single point.",
        prompt: "Match Point. Close-up on the face of the tennis player with the likeness of the person in the image. Sweat is beading on their forehead, eyes are locked on the ball, a mix of exhaustion and fierce determination. The roar of the crowd is palpable. Shallow depth of field, emotional."
    },
    {
        title: "VICTORY!",
        caption: "A dream realized. You are the US Open Champion.",
        prompt: `VICTORY! The tennis player with the likeness of the person in the image has just won. They drop to their knees on the court, arms raised to the sky in triumph. Confetti begins to fall. In the background, a respectful but disappointed ${opponentName} approaches the net. Emotional, epic, cinematic.`
    },
    {
        title: "The Champion",
        caption: "Lifting the trophy, a moment etched in history.",
        prompt: "The tennis player with the likeness of the person in the image is triumphant, lifting the US Open trophy with both hands as confetti rains down. A huge smile of joy and relief is on their face. Photographers' flashes illuminate the scene. Close-up, celebratory, iconic sports photograph."
    }
];

// Event Listeners
imagePreviewContainer.addEventListener('click', () => imageUpload.click());
imageUpload.addEventListener('change', handleImageUpload);
generateBtn.addEventListener('click', generateStoryboard);
resetBtn.addEventListener('click', resetApp);
generateTextBtn.addEventListener('click', generateAiTextFeatures);


function handleImageUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target?.result as string;
            uploadText.textContent = "Photo selected. Ready to generate!";
            generateBtn.disabled = false;
            // Convert to base64 for API
            userImageBase64 = (e.target?.result as string).split(',')[1];
        }
        reader.readAsDataURL(file);
    }
}

function generateStoryboard() {
    if (!userImageBase64) {
        showError("Please upload an image first.");
        return;
    }
    
    const selectedOpponent = opponentSelect.value;
    const storyboardPrompts = getStoryboardPrompts(selectedOpponent);

    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating... Please Wait...';
    
    uploadSection.classList.add('hidden');
    storyboardSection.classList.remove('hidden');
    aiFeaturesSection.classList.add('hidden'); // Hide AI text features on new generation
    storyboardGrid.innerHTML = ''; // Clear previous results
    hideError();

    // Create placeholder panels
    storyboardPrompts.forEach(panel => {
        const panelDiv = document.createElement('div');
        panelDiv.id = `panel-${panel.title.replace(/\s+/g, '-')}`;
        panelDiv.className = 'storyboard-panel relative aspect-square flex items-center justify-center group';
        panelDiv.innerHTML = `
            <div class="loader-container absolute inset-0 flex flex-col items-center justify-center">
                <div class="loader"></div>
                <p class="mt-3 text-sm font-medium">${panel.title}</p>
            </div>
        `;
        storyboardGrid.appendChild(panelDiv);
    });

    // Generate images sequentially
    generatePanel(0, storyboardPrompts);
}

async function generatePanel(index: number, prompts: ReturnType<typeof getStoryboardPrompts>) {
    if (index >= prompts.length) {
        generateBtn.textContent = 'Step 2: Generate My SlamStory!';
        aiFeaturesSection.classList.remove('hidden'); // Show AI text features section
        return; // All panels generated
    }

    const panelData = prompts[index];
    const panelId = `panel-${panelData.title.replace(/\s+/g, '-')}`;
    const panelDiv = document.getElementById(panelId) as HTMLElement;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    {
                        text: panelData.prompt
                    },
                    {
                        inlineData: {
                            mimeType: "image/jpeg",
                            data: userImageBase64!
                        }
                    }
                ]
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (!imagePart || !imagePart.inlineData) {
            throw new Error("No image data found in API response.");
        }
        
        const base64Data = imagePart.inlineData.data;
        const imageUrl = `data:image/png;base64,${base64Data}`;
        const fileName = `SlamStory-${panelData.title.replace(/[^a-zA-Z0-9]/g, '-')}.png`;
        panelDiv.innerHTML = `
            <img src="${imageUrl}" alt="${panelData.title}" class="w-full h-full object-cover">
            <div class="absolute bottom-0 left-0 right-0 p-4 caption">
                <h3 class="font-bold text-lg">${panelData.title}</h3>
                <p class="text-sm text-gray-200">${panelData.caption}</p>
            </div>
            <a href="${imageUrl}" download="${fileName}" class="download-btn absolute top-2 right-2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-2 rounded-full" title="Download Image">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                    <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                </svg>
            </a>
        `;

    } catch (error) {
        console.error(`Error generating panel ${index + 1}:`, error);
        panelDiv.innerHTML = `
            <div class="p-4 text-center bg-red-900 h-full flex flex-col justify-center">
                <h3 class="font-bold text-red-200">${panelData.title}</h3>
                <p class="text-sm text-red-300 mt-2">Failed to generate image. Please try again.</p>
            </div>
        `;
    }

    // Generate next panel
    await generatePanel(index + 1, prompts);
}

async function generateAiTextFeatures() {
    generateTextBtn.disabled = true;
    generateTextBtn.textContent = 'Generating...';

    // Show containers with loaders
    commentaryContainer.classList.remove('hidden');
    interviewContainer.classList.remove('hidden');
    commentaryContent.innerHTML = `<div class="loader-container absolute inset-0 flex items-center justify-center"><div class="loader"></div></div>`;
    interviewContent.innerHTML = `<div class="loader-container absolute inset-0 flex items-center justify-center"><div class="loader"></div></div>`;

    const opponentName = opponentSelect.value;
    const commentaryPrompt = `You are an elite tennis commentator. Write a short, dramatic, and exciting summary for a highlights reel of the US Open final where a new champion defeated ${opponentName}. The key moments were: the intense walkout, a powerful opening serve, a grueling baseline rally, a tense match point, and the final victory celebration with the trophy. Keep it to one paragraph.`;
    const interviewPrompt = `You are a sports journalist. You are interviewing a tennis player who just won their first US Open title by defeating ${opponentName}. Ask them three insightful and celebratory questions for their post-match interview.`;

    try {
        // Run both API calls in parallel
        const [commentaryResult, interviewResult] = await Promise.all([
            generateText(commentaryPrompt),
            generateText(interviewPrompt)
        ]);
        
        commentaryContent.innerHTML = `<p>${commentaryResult}</p>`;
        interviewContent.innerHTML = `<p>${interviewResult}</p>`;

    } catch (error) {
        console.error("Error generating AI text features:", error);
        commentaryContent.innerHTML = `<p class="text-red-400">Could not generate commentary. Please try again.</p>`;
        interviewContent.innerHTML = `<p class="text-red-400">Could not generate interview questions. Please try again.</p>`;
    } finally {
         generateTextBtn.textContent = '✨ Regenerate Commentary & Interview';
         generateTextBtn.disabled = false;
    }
}

async function generateText(prompt: string) {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text;
}

function resetApp() {
    uploadSection.classList.remove('hidden');
    storyboardSection.classList.add('hidden');
    aiFeaturesSection.classList.add('hidden');
    storyboardGrid.innerHTML = '';
    previewImg.src = 'https://placehold.co/200x200/374151/E5E7EB?text=Upload+Photo';
    uploadText.textContent = 'Click here to upload a clear, front-facing photo.';
    
    generateBtn.disabled = true;
    generateBtn.textContent = 'Step 2: Generate My SlamStory!';
    
    imageUpload.value = '';
    userImageBase64 = null;
    hideError();
    
    // Reset AI text features
    commentaryContainer.classList.add('hidden');
    interviewContainer.classList.add('hidden');
    commentaryContent.innerHTML = '';
    interviewContent.innerHTML = '';
    
    generateTextBtn.disabled = false;
    generateTextBtn.textContent = '✨ Generate Match Commentary & Interview';
}

function showError(message: string) {
    errorText.textContent = message;
    errorMessage.classList.remove('hidden');
}

function hideError() {
     errorMessage.classList.add('hidden');
}
