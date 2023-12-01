FROM node:16

COPY package.json .

RUN npm install --save

COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
