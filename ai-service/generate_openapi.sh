#!/bin/bash
mkdir -p /app/openapi
python -c "import json; from app.main import app; print(\"Generating OpenAPI schema...\"); schema = app.openapi(); f = open(\"/app/openapi/openapi.json\", \"w\"); json.dump(schema, f, indent=2); f.close(); print(\"OpenAPI schema generated successfully!\");"
