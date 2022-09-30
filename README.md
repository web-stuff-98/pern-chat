# PERN-CHAT

This is my portfolio fullstack app. Its a chat/blog using Next js and Amazon RDS Postgres. You can attach videos and images to messages, also profile pictures and room images are live. There is also a static blog with serverside pagination and tag filtering functionality. The code is based on previous projects using MongoDB.

I was using ElephantSQL to begin with but that didn't work with Next js serverless functions because it creates a new client connection every time a serverless function runs so didn't support more than 1 or 2 users being on the site at the same time. I changed to Amazon RDS to get a higher number of maximum connections instead of having to rewrite all the backend code to scale better using Prisma or something similar. This is my first project using SQL.