# hitl_llm_eval

## Setup

1. Create a Python virtual environment:
   ```bash
   python3 -m venv venv
   ```

2. Launch the virtual environment:
   ```bash
   source venv/bin/activate
   ```

3. Install the requirements:
   ```bash
   pip install -r requirements.txt
   ```

## Running the API

Run the FastAPI server with:
```bash
python api_fastapi.py --review-file deepeval_ollama_llama3_20260120_144841.json --port 5000
```

### Steps to have the dashboard UI built

```
cd client && yarn && yarn build
```

this will create a client_dist folder.

that's it

that folder will be served on /dashboard route.