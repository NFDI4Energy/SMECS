FROM python:3.11-slim

RUN apt-get update && \
    apt-get install -y \
        build-essential \
        make \
        gcc \
        git

RUN addgroup --system django \
    && adduser --system --ingroup django django

COPY requirements.txt /tmp/requirements.txt
RUN pip install -r /tmp/requirements.txt

RUN apt-get remove -y --purge make gcc build-essential \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

COPY ./compose/start /start
RUN sed -i 's/\r$//g' /start
RUN chmod +x /start
RUN chown django /start

COPY ./ /app
RUN chown -R django /app

USER django

WORKDIR /app
RUN mkdir staticfiles
