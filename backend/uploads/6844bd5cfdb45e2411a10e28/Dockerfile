FROM python:3.9-slim
WORKDIR /app
COPY code.py requirements.txt ./
RUN pip install -r requirements.txt
CMD ["python", "code.py"]