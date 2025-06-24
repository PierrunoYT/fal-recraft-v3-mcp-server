#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { fal } from "@fal-ai/client";
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
// Check for required environment variable
const FAL_KEY = process.env.FAL_KEY;
let falConfigured = false;
if (!FAL_KEY) {
    console.error('FAL_KEY environment variable is required');
    console.error('Please set your fal.ai API key: export FAL_KEY=your_api_key_here');
    // Server continues running, no process.exit()
}
else {
    // Configure fal.ai client
    fal.config({
        credentials: FAL_KEY
    });
    falConfigured = true;
}
// Download image function
async function downloadImage(url, filename) {
    return new Promise((resolve, reject) => {
        try {
            const parsedUrl = new URL(url);
            const client = parsedUrl.protocol === 'https:' ? https : http;
            // Create images directory if it doesn't exist
            const imagesDir = path.join(process.cwd(), 'images');
            if (!fs.existsSync(imagesDir)) {
                fs.mkdirSync(imagesDir, { recursive: true });
            }
            const filePath = path.join(imagesDir, filename);
            const file = fs.createWriteStream(filePath);
            client.get(url, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to download image: HTTP ${response.statusCode}`));
                    return;
                }
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve(filePath);
                });
                file.on('error', (err) => {
                    fs.unlink(filePath, () => { }); // Delete partial file
                    reject(err);
                });
            }).on('error', (err) => {
                reject(err);
            });
        }
        catch (error) {
            reject(error);
        }
    });
}
// Generate safe filename for images
function generateImageFilename(prompt, index, seed) {
    const safePrompt = prompt
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const seedStr = seed ? `_${seed}` : '';
    return `recraft_v3_${safePrompt}${seedStr}_${index}_${timestamp}.png`;
}
// Create MCP server
const server = new McpServer({
    name: "fal-recraft-v3-server",
    version: "1.0.0",
});
// Tool: Generate images with fal-ai/recraft/v3
server.tool("recraft_v3_generate", {
    description: "Generate high-quality images using fal-ai/recraft/v3 - Advanced text-to-image generation model with superior design capabilities",
    inputSchema: {
        type: "object",
        properties: {
            prompt: {
                type: "string",
                description: "The text prompt to generate an image from"
            },
            image_size: {
                oneOf: [
                    {
                        type: "string",
                        enum: [
                            "1024x1024", "1365x1024", "1024x1365", "1536x1024", "1024x1536",
                            "1820x1024", "1024x1820", "1024x2048", "2048x1024", "1434x1024",
                            "1024x1434", "1024x1280", "1280x1024", "1024x1707"
                        ],
                        description: "Predefined image size"
                    },
                    {
                        type: "object",
                        properties: {
                            width: {
                                type: "integer",
                                description: "The width of the generated image",
                                minimum: 512,
                                maximum: 2048
                            },
                            height: {
                                type: "integer",
                                description: "The height of the generated image",
                                minimum: 512,
                                maximum: 2048
                            }
                        },
                        required: ["width", "height"]
                    }
                ],
                description: "The resolution of the generated image. Can be a predefined size or custom width/height",
                default: "1024x1024"
            },
            style: {
                type: "string",
                enum: [
                    "any", "realistic_image", "digital_illustration", "vector_illustration",
                    "realistic_image/b_and_w", "realistic_image/hard_flash", "realistic_image/hdr",
                    "realistic_image/natural_light", "realistic_image/studio_portrait", "realistic_image/enterprise",
                    "realistic_image/motion_blur", "digital_illustration/pixel_art", "digital_illustration/hand_drawn",
                    "digital_illustration/grain", "digital_illustration/infantile_sketch", "digital_illustration/2d_art_poster",
                    "digital_illustration/handmade_3d", "digital_illustration/hand_drawn_outline", "digital_illustration/engraving_color",
                    "digital_illustration/2d_art_poster_2", "vector_illustration/engraving_bw", "vector_illustration/line_art",
                    "vector_illustration/line_circuit", "vector_illustration/linocut"
                ],
                description: "The style to generate with",
                default: "any"
            },
            colors: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        r: { type: "integer", minimum: 0, maximum: 255 },
                        g: { type: "integer", minimum: 0, maximum: 255 },
                        b: { type: "integer", minimum: 0, maximum: 255 }
                    },
                    required: ["r", "g", "b"]
                },
                description: "A list of RGB color objects to use in the generation",
                maxItems: 5
            },
            style_id: {
                type: "string",
                description: "Optional style ID for custom styles"
            },
            enable_safety_checker: {
                type: "boolean",
                description: "Enable safety checker to filter out potentially harmful content",
                default: true
            },
            num_images: {
                type: "integer",
                description: "Number of images to generate",
                default: 1,
                minimum: 1,
                maximum: 4
            },
            seed: {
                type: "integer",
                description: "Seed for the random number generator"
            },
            sync_mode: {
                type: "boolean",
                description: "If set to true, the function will wait for the image to be generated and uploaded before returning the response",
                default: true
            }
        },
        required: ["prompt"]
    }
}, async (args) => {
    // Check if fal.ai client is configured
    if (!falConfigured) {
        return {
            content: [{
                    type: "text",
                    text: "Error: FAL_KEY environment variable is not set. Please configure your fal.ai API key."
                }],
            isError: true
        };
    }
    const { prompt, image_size = "1024x1024", style = "any", colors, style_id, enable_safety_checker = true, num_images = 1, seed, sync_mode = true } = args;
    try {
        // Prepare input for fal.ai API
        const input = {
            prompt,
            image_size,
            style,
            enable_safety_checker,
            num_images,
            sync_mode
        };
        // Add optional parameters if provided
        if (colors && colors.length > 0)
            input.colors = colors;
        if (style_id)
            input.style_id = style_id;
        if (seed !== undefined)
            input.seed = seed;
        console.error(`Generating image with fal-ai/recraft/v3 - prompt: "${prompt}"`);
        // Call fal.ai recraft/v3 API
        const result = await fal.subscribe("fal-ai/recraft/v3/text-to-image", {
            input,
            logs: true,
            onQueueUpdate: (update) => {
                if (update.status === "IN_PROGRESS") {
                    update.logs.map((log) => log.message).forEach(console.error);
                }
            },
        });
        const output = result.data;
        // Download images locally
        console.error("Downloading images locally...");
        const downloadedImages = [];
        for (let i = 0; i < output.images.length; i++) {
            const image = output.images[i];
            const filename = generateImageFilename(prompt, i + 1, output.seed);
            try {
                const localPath = await downloadImage(image.url, filename);
                downloadedImages.push({
                    url: image.url,
                    localPath,
                    index: i + 1,
                    content_type: image.content_type || 'image/png',
                    file_name: image.file_name || filename,
                    file_size: image.file_size,
                    filename
                });
                console.error(`Downloaded: ${filename}`);
            }
            catch (downloadError) {
                console.error(`Failed to download image ${i + 1}:`, downloadError);
                // Still add the image info without local path
                downloadedImages.push({
                    url: image.url,
                    localPath: null,
                    index: i + 1,
                    content_type: image.content_type || 'image/png',
                    file_name: image.file_name || filename,
                    file_size: image.file_size,
                    filename
                });
            }
        }
        // Format response with download information
        const imageDetails = downloadedImages.map(img => {
            let details = `Image ${img.index}:`;
            if (img.localPath) {
                details += `\n  Local Path: ${img.localPath}`;
            }
            details += `\n  Original URL: ${img.url}`;
            details += `\n  Filename: ${img.filename}`;
            details += `\n  Content Type: ${img.content_type}`;
            if (img.file_size) {
                details += `\n  File Size: ${img.file_size} bytes`;
            }
            return details;
        }).join('\n\n');
        const imageSizeStr = typeof image_size === 'string' ? image_size : `${image_size.width}x${image_size.height}`;
        const responseText = `Successfully generated ${downloadedImages.length} image(s) using fal-ai/recraft/v3:

Prompt: "${prompt}"
Image Size: ${imageSizeStr}
Style: ${style}
${colors && colors.length > 0 ? `Colors: ${colors.length} custom colors` : ''}
${style_id ? `Style ID: ${style_id}` : ''}
Safety Checker: ${enable_safety_checker ? 'Enabled' : 'Disabled'}
${output.seed ? `Seed: ${output.seed}` : 'Seed: Auto-generated'}
Request ID: ${result.requestId}

Generated Images:
${imageDetails}

${downloadedImages.some(img => img.localPath) ? 'Images have been downloaded to the local \'images\' directory.' : 'Note: Local download failed, but original URLs are available.'}`;
        return {
            content: [
                {
                    type: "text",
                    text: responseText
                }
            ]
        };
    }
    catch (error) {
        console.error('Error generating image:', error);
        let errorMessage = "Failed to generate image with fal-ai/recraft/v3.";
        if (error instanceof Error) {
            errorMessage += ` Error: ${error.message}`;
        }
        return {
            content: [
                {
                    type: "text",
                    text: errorMessage
                }
            ],
            isError: true
        };
    }
});
// Tool: Generate images using queue method
server.tool("recraft_v3_generate_queue", {
    description: "Submit a long-running image generation request to the queue using fal-ai/recraft/v3",
    inputSchema: {
        type: "object",
        properties: {
            prompt: {
                type: "string",
                description: "The text prompt to generate an image from"
            },
            image_size: {
                oneOf: [
                    {
                        type: "string",
                        enum: [
                            "1024x1024", "1365x1024", "1024x1365", "1536x1024", "1024x1536",
                            "1820x1024", "1024x1820", "1024x2048", "2048x1024", "1434x1024",
                            "1024x1434", "1024x1280", "1280x1024", "1024x1707"
                        ],
                        description: "Predefined image size"
                    },
                    {
                        type: "object",
                        properties: {
                            width: { type: "integer", minimum: 512, maximum: 2048 },
                            height: { type: "integer", minimum: 512, maximum: 2048 }
                        },
                        required: ["width", "height"]
                    }
                ],
                default: "1024x1024"
            },
            style: {
                type: "string",
                enum: [
                    "any", "realistic_image", "digital_illustration", "vector_illustration",
                    "realistic_image/b_and_w", "realistic_image/hard_flash", "realistic_image/hdr",
                    "realistic_image/natural_light", "realistic_image/studio_portrait", "realistic_image/enterprise",
                    "realistic_image/motion_blur", "digital_illustration/pixel_art", "digital_illustration/hand_drawn",
                    "digital_illustration/grain", "digital_illustration/infantile_sketch", "digital_illustration/2d_art_poster",
                    "digital_illustration/handmade_3d", "digital_illustration/hand_drawn_outline", "digital_illustration/engraving_color",
                    "digital_illustration/2d_art_poster_2", "vector_illustration/engraving_bw", "vector_illustration/line_art",
                    "vector_illustration/line_circuit", "vector_illustration/linocut"
                ],
                default: "any"
            },
            colors: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        r: { type: "integer", minimum: 0, maximum: 255 },
                        g: { type: "integer", minimum: 0, maximum: 255 },
                        b: { type: "integer", minimum: 0, maximum: 255 }
                    },
                    required: ["r", "g", "b"]
                },
                maxItems: 5
            },
            style_id: {
                type: "string"
            },
            enable_safety_checker: {
                type: "boolean",
                default: true
            },
            num_images: {
                type: "integer",
                default: 1,
                minimum: 1,
                maximum: 4
            },
            seed: {
                type: "integer"
            },
            webhook_url: {
                type: "string",
                description: "Optional webhook URL for result notifications"
            }
        },
        required: ["prompt"]
    }
}, async (args) => {
    if (!falConfigured) {
        return {
            content: [{
                    type: "text",
                    text: "Error: FAL_KEY environment variable is not set. Please configure your fal.ai API key."
                }],
            isError: true
        };
    }
    const { webhook_url, ...input } = args;
    try {
        console.error(`Submitting queue request for fal-ai/recraft/v3 - prompt: "${input.prompt}"`);
        const result = await fal.queue.submit("fal-ai/recraft/v3/text-to-image", {
            input,
            webhookUrl: webhook_url
        });
        return {
            content: [
                {
                    type: "text",
                    text: `Successfully submitted image generation request to queue.

Request ID: ${result.request_id}
Prompt: "${input.prompt}"
${webhook_url ? `Webhook URL: ${webhook_url}` : 'No webhook configured'}

Use the request ID with recraft_v3_queue_status to check progress or recraft_v3_queue_result to get the final result.`
                }
            ]
        };
    }
    catch (error) {
        console.error('Error submitting queue request:', error);
        let errorMessage = "Failed to submit queue request for fal-ai/recraft/v3.";
        if (error instanceof Error) {
            errorMessage += ` Error: ${error.message}`;
        }
        return {
            content: [
                {
                    type: "text",
                    text: errorMessage
                }
            ],
            isError: true
        };
    }
});
// Tool: Check queue status
server.tool("recraft_v3_queue_status", {
    description: "Check the status of a queued image generation request",
    inputSchema: {
        type: "object",
        properties: {
            request_id: {
                type: "string",
                description: "The request ID from queue submission"
            },
            logs: {
                type: "boolean",
                description: "Include logs in response",
                default: true
            }
        },
        required: ["request_id"]
    }
}, async (args) => {
    if (!falConfigured) {
        return {
            content: [{
                    type: "text",
                    text: "Error: FAL_KEY environment variable is not set. Please configure your fal.ai API key."
                }],
            isError: true
        };
    }
    const { request_id, logs = true } = args;
    try {
        console.error(`Checking status for request: ${request_id}`);
        const status = await fal.queue.status("fal-ai/recraft/v3/text-to-image", {
            requestId: request_id,
            logs
        });
        let responseText = `Queue Status for Request ID: ${request_id}

Status: ${status.status}`;
        if (status.response_url) {
            responseText += `\nResponse URL: ${status.response_url}`;
        }
        // Handle logs if available (logs might be in different property depending on status)
        const statusAny = status;
        if (statusAny.logs && statusAny.logs.length > 0) {
            responseText += `\n\nLogs:\n${statusAny.logs.map((log) => `[${log.timestamp}] ${log.message}`).join('\n')}`;
        }
        return {
            content: [
                {
                    type: "text",
                    text: responseText
                }
            ]
        };
    }
    catch (error) {
        console.error('Error checking queue status:', error);
        let errorMessage = "Failed to check queue status.";
        if (error instanceof Error) {
            errorMessage += ` Error: ${error.message}`;
        }
        return {
            content: [
                {
                    type: "text",
                    text: errorMessage
                }
            ],
            isError: true
        };
    }
});
// Tool: Get queue result
server.tool("recraft_v3_queue_result", {
    description: "Get the result of a completed queued image generation request",
    inputSchema: {
        type: "object",
        properties: {
            request_id: {
                type: "string",
                description: "The request ID from queue submission"
            }
        },
        required: ["request_id"]
    }
}, async (args) => {
    if (!falConfigured) {
        return {
            content: [{
                    type: "text",
                    text: "Error: FAL_KEY environment variable is not set. Please configure your fal.ai API key."
                }],
            isError: true
        };
    }
    const { request_id } = args;
    try {
        console.error(`Getting result for request: ${request_id}`);
        const result = await fal.queue.result("fal-ai/recraft/v3/text-to-image", {
            requestId: request_id
        });
        const output = result.data;
        // Download images locally
        console.error("Downloading images locally...");
        const downloadedImages = [];
        for (let i = 0; i < output.images.length; i++) {
            const image = output.images[i];
            const filename = generateImageFilename(`queue_result_${request_id}`, i + 1, output.seed);
            try {
                const localPath = await downloadImage(image.url, filename);
                downloadedImages.push({
                    url: image.url,
                    localPath,
                    index: i + 1,
                    content_type: image.content_type || 'image/png',
                    file_name: image.file_name || filename,
                    file_size: image.file_size,
                    filename
                });
                console.error(`Downloaded: ${filename}`);
            }
            catch (downloadError) {
                console.error(`Failed to download image ${i + 1}:`, downloadError);
                downloadedImages.push({
                    url: image.url,
                    localPath: null,
                    index: i + 1,
                    content_type: image.content_type || 'image/png',
                    file_name: image.file_name || filename,
                    file_size: image.file_size,
                    filename
                });
            }
        }
        const imageDetails = downloadedImages.map(img => {
            let details = `Image ${img.index}:`;
            if (img.localPath) {
                details += `\n  Local Path: ${img.localPath}`;
            }
            details += `\n  Original URL: ${img.url}`;
            details += `\n  Filename: ${img.filename}`;
            details += `\n  Content Type: ${img.content_type}`;
            if (img.file_size) {
                details += `\n  File Size: ${img.file_size} bytes`;
            }
            return details;
        }).join('\n\n');
        const responseText = `Queue Result for Request ID: ${request_id}

Successfully completed! Generated ${downloadedImages.length} image(s):

${output.seed ? `Seed: ${output.seed}` : 'Seed: Auto-generated'}

Generated Images:
${imageDetails}

${downloadedImages.some(img => img.localPath) ? 'Images have been downloaded to the local \'images\' directory.' : 'Note: Local download failed, but original URLs are available.'}`;
        return {
            content: [
                {
                    type: "text",
                    text: responseText
                }
            ]
        };
    }
    catch (error) {
        console.error('Error getting queue result:', error);
        let errorMessage = "Failed to get queue result.";
        if (error instanceof Error) {
            errorMessage += ` Error: ${error.message}`;
        }
        return {
            content: [
                {
                    type: "text",
                    text: errorMessage
                }
            ],
            isError: true
        };
    }
});
// Handle shutdown gracefully
process.on('SIGINT', () => {
    console.error('Received SIGINT, shutting down gracefully...');
    process.exit(0);
});
process.on('SIGTERM', () => {
    console.error('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map