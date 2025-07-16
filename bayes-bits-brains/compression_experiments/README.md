# Compression Experiments

This directory contains the text samples and compression results for the compression widget.

## Files Structure

- `texts/list.json` - Configuration of text samples to display
- `texts/*.txt` - Text sample files
- `compression_results.json` - Compression experiment results

## compression_results.json Format

The widget reads compression results from `compression_results.json`. For each text file (using filename without extension as key), the following fields are supported:

```json
{
  "filename_without_extension": {
    "name": "Display Name",
    "description": "Brief description",
    "filename": "filename.txt",
    "text_length": 1000,
    "naive_bits": 8000,
    "letterwise_bits": 4000,
    "letterwise_ratio": 2.0,
    "zip_bits": 3000,
    "zip_ratio": 2.67,
    "gpt2_bits": 1000,
    "gpt2_ratio": 8.0,
    "llama_bits": 800,
    "llama_ratio": 10.0,
    "timestamp": "2025-06-14T11:43:52.036126"
  }
}
```

## Default Behavior

If a compression method is not present in the results file, the widget will:
- Use naive compression (8 bits per character) for the bit count
- Show "1.00x" ratio (no compression)

This allows you to run experiments incrementally and only update the results file with new data.

## Supported Algorithms

1. **Naive** - 8 bits per character (always 1.00x ratio)
2. **Letter-wise (optimal)** - Uses character entropy (theoretical optimal)
3. **ZIP (zlib)** - Standard ZIP compression
4. **LLM (GPT-2)** - Language model compression using GPT-2
5. **LLM (Llama 4)** - Language model compression using Llama 4

## Running Experiments

Use the master script to generate compression results:

```bash
cd code/compression_experiments
python3 run_all_compression_experiments.py
# Copy results to public directory
cp compression_results.json ../../public/compression_experiments/
```

For LLM experiments, run them separately and manually update the results file with the additional fields (`gpt2_bits`, `gpt2_ratio`, `llama_bits`, `llama_ratio`).