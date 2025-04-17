FROM python:3.9-slim

ENV PYTHONUNBUFFERED=1

WORKDIR /smecs

COPY requirements.txt requirements.txt

RUN pip install -r requirements.txt

COPY . .

CMD python manage.py runserver 0.0.0.0:8000
