FROM node:21

WORKDIR /app

COPY . .

RUN npm install

EXPOSE 3000

CMD ["npm", "run dev"]
