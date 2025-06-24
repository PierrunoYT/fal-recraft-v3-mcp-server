# fal-ai/recraft/v3 MCP Server

A Model Context Protocol (MCP) server that provides access to the fal-ai/recraft/v3 image generation model. This server allows you to generate high-quality images with superior design capabilities using advanced AI technology through the fal.ai platform.

## Features

- **High-Quality Image Generation**: Generate stunning images using the fal-ai/recraft/v3 model
- **Superior Design Capabilities**: Advanced text-to-image generation with excellent design quality
- **Multiple Generation Methods**: Support for synchronous and queue-based generation
- **Flexible Image Sizing**: Support for predefined sizes and custom dimensions
- **Advanced Style Control**: Comprehensive style system with realistic, digital, and vector illustration styles
- **Color Control**: Specify custom RGB colors to guide generation
- **Local Image Download**: Automatically downloads generated images to local storage
- **Queue Management**: Submit long-running requests and check their status
- **Webhook Support**: Optional webhook notifications for completed requests
- **Safety Checker**: Built-in content safety filtering

## Installation

1. Clone this repository:
```bash
git clone https://github.com/PierrunoYT/fal-recraft-v3-mcp-server.git
cd fal-recraft-v3-mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Configuration

### Environment Variables

Set your fal.ai API key as an environment variable:

```bash
export FAL_KEY="your_fal_api_key_here"
```

You can get your API key from [fal.ai](https://fal.ai/).

### MCP Client Configuration

Add this server to your MCP client configuration. For example, in Claude Desktop's config file:

```json
{
  "mcpServers": {
    "fal-recraft-v3": {
      "command": "npx",
      "args": ["-y", "https://github.com/PierrunoYT/fal-recraft-v3-mcp-server.git"],
      "env": {
        "FAL_KEY": "your_fal_api_key_here"
      }
    }
  }
}
```

If the package is published to npm, you can use:

```json
{
  "mcpServers": {
    "fal-recraft-v3": {
      "command": "npx",
      "args": ["fal-recraft-v3-mcp-server"],
      "env": {
        "FAL_KEY": "your_fal_api_key_here"
      }
    }
  }
}
```

Alternatively, if you've cloned the repository locally:

```json
{
  "mcpServers": {
    "fal-recraft-v3": {
      "command": "node",
      "args": ["/path/to/fal-recraft-v3-mcp-server/build/index.js"],
      "env": {
        "FAL_KEY": "your_fal_api_key_here"
      }
    }
  }
}
```

## Available Tools

### 1. `recraft_v3_generate`

Generate images using the standard synchronous method.

**Parameters:**
- `prompt` (required): Text description of the image to generate
- `image_size` (optional): Predefined size or custom {width, height} object (default: "1024x1024")
- `style` (optional): Style to use for generation (default: "any")
- `colors` (optional): Array of RGB color objects to guide generation (max 5 colors)
- `style_id` (optional): Custom style ID for specific styles
- `enable_safety_checker` (optional): Enable content safety filtering (default: true)
- `num_images` (optional): Number of images to generate (1-4, default: 1)
- `seed` (optional): Random seed for reproducible results
- `sync_mode` (optional): Wait for completion (default: true)

**Example:**
```json
{
  "prompt": "A futuristic cityscape with flying cars and neon lights",
  "image_size": "1024x1024",
  "style": "digital_illustration",
  "colors": [
    {"r": 0, "g": 255, "b": 255},
    {"r": 255, "g": 0, "b": 255}
  ],
  "enable_safety_checker": true
}
```

### 2. `recraft_v3_generate_queue`

Submit a long-running image generation request to the queue.

**Parameters:** Same as `recraft_v3_generate` plus:
- `webhook_url` (optional): URL for webhook notifications

**Returns:** A request ID for tracking the job

### 3. `recraft_v3_queue_status`

Check the status of a queued request.

**Parameters:**
- `request_id` (required): The request ID from queue submission
- `logs` (optional): Include logs in response (default: true)

### 4. `recraft_v3_queue_result`

Get the result of a completed queued request.

**Parameters:**
- `request_id` (required): The request ID from queue submission

## Image Sizes

### Predefined Sizes
- `1024x1024`: Square format
- `1365x1024`: Wide landscape
- `1024x1365`: Tall portrait
- `1536x1024`: Ultra-wide landscape
- `1024x1536`: Ultra-tall portrait
- `1820x1024`: Panoramic landscape
- `1024x1820`: Panoramic portrait
- `1024x2048`: Extra tall portrait
- `2048x1024`: Extra wide landscape
- `1434x1024`: Wide landscape variant
- `1024x1434`: Tall portrait variant
- `1024x1280`: Standard portrait
- `1280x1024`: Standard landscape
- `1024x1707`: Long portrait

### Custom Sizes
You can also specify custom dimensions (512-2048px):
```json
{
  "image_size": {
    "width": 1280,
    "height": 720
  }
}
```

## Style Control

Recraft V3 offers comprehensive style control with three main categories:

### Realistic Image Styles
- `realistic_image`: General realistic style
- `realistic_image/b_and_w`: Black and white photography
- `realistic_image/hard_flash`: Hard flash photography
- `realistic_image/hdr`: HDR photography
- `realistic_image/natural_light`: Natural lighting
- `realistic_image/studio_portrait`: Studio portrait style
- `realistic_image/enterprise`: Professional/corporate style
- `realistic_image/motion_blur`: Motion blur effects

### Digital Illustration Styles
- `digital_illustration`: General digital art
- `digital_illustration/pixel_art`: Pixel art style
- `digital_illustration/hand_drawn`: Hand-drawn appearance
- `digital_illustration/grain`: Textured/grainy style
- `digital_illustration/infantile_sketch`: Childlike sketch style
- `digital_illustration/2d_art_poster`: 2D poster art
- `digital_illustration/handmade_3d`: 3D handmade style
- `digital_illustration/hand_drawn_outline`: Outlined hand-drawn style
- `digital_illustration/engraving_color`: Colored engraving style
- `digital_illustration/2d_art_poster_2`: Alternative 2D poster style

### Vector Illustration Styles
- `vector_illustration`: General vector art
- `vector_illustration/engraving_bw`: Black and white engraving
- `vector_illustration/line_art`: Clean line art
- `vector_illustration/line_circuit`: Circuit-like line patterns
- `vector_illustration/linocut`: Linocut print style

### Any Style
- `any`: Let the model choose the best style (default)

**Example:**
```json
{
  "style": "digital_illustration/pixel_art"
}
```

## Color Control

Guide the generation with specific RGB colors:

```json
{
  "colors": [
    {"r": 255, "g": 0, "b": 0},
    {"r": 0, "g": 255, "b": 0},
    {"r": 0, "g": 0, "b": 255}
  ]
}
```

**Note:** Maximum of 5 colors can be specified.

## Safety Checker

Control content safety filtering:

```json
{
  "enable_safety_checker": true
}
```

When enabled (default), the safety checker filters out potentially harmful content.

## Output

Generated images are automatically downloaded to a local `images/` directory with descriptive filenames. The response includes:

- Local file paths
- Original URLs
- Image dimensions (when available)
- Content types
- File sizes (when available)
- Generation parameters used
- Request IDs for tracking
- Seed values for reproducibility

## Error Handling

The server provides detailed error messages for:
- Missing API keys
- Invalid parameters
- Network issues
- API rate limits
- Generation failures
- Safety checker violations

## Development

### Running in Development Mode

```bash
npm run dev
```

### Testing the Server

```bash
npm test
```

### Getting the Installation Path

```bash
npm run get-path
```

## API Reference

This server implements the fal-ai/recraft/v3 API. For detailed API documentation, visit:
- [fal.ai Documentation](https://fal.ai/models/fal-ai/recraft/v3)
- [fal.ai Client Library](https://github.com/fal-ai/fal-js)

## Examples

### Basic Text-to-Image Generation
```json
{
  "prompt": "A majestic dragon soaring through clouds"
}
```

### Advanced Generation with Style Control
```json
{
  "prompt": "A cyberpunk cityscape at night",
  "style": "digital_illustration",
  "colors": [
    {"r": 0, "g": 255, "b": 255},
    {"r": 255, "g": 0, "b": 255}
  ],
  "image_size": "1536x1024"
}
```

### Realistic Photography Style
```json
{
  "prompt": "A portrait of a woman in natural lighting",
  "style": "realistic_image/natural_light",
  "image_size": "1024x1280"
}
```

### Vector Art Generation
```json
{
  "prompt": "A minimalist logo design for a tech company",
  "style": "vector_illustration/line_art",
  "colors": [
    {"r": 0, "g": 0, "b": 0},
    {"r": 255, "g": 255, "b": 255}
  ]
}
```

### Queue-based Generation with Webhook
```json
{
  "prompt": "A detailed architectural visualization of a modern building",
  "style": "realistic_image/hdr",
  "webhook_url": "https://your-server.com/webhook"
}
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions:
- Open an issue on [GitHub](https://github.com/PierrunoYT/fal-recraft-v3-mcp-server/issues)
- Check the [fal.ai documentation](https://fal.ai/docs)

## Changelog

### v1.0.0
- Initial release with fal-ai/recraft/v3 API support
- Text-to-image generation with superior design capabilities
- Comprehensive style system with realistic, digital, and vector illustration styles
- RGB color control for guided generation
- Queue management with webhook support
- Local image download functionality
- Built-in safety checker
- Comprehensive error handling