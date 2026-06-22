FROM python:3.10-slim

ENV PYTHONUNBUFFERED=1

WORKDIR /smecs

RUN apt-get update && \
    apt-get install -y \
        git

COPY requirements.txt requirements.txt

RUN pip install -r requirements.txt

COPY . .

CMD python manage.py runserver 0.0.0.0:8000
