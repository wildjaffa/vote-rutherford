node ./dist/server/entry.mjs & 
sleep 5
npx prisma migrate deploy
wait