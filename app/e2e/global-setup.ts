import { createServer } from "vite";

const HOST = "127.0.0.1";
const PORT = 4188;

export default async function globalSetup() {
  const server = await createServer({
    server: {
      host: HOST,
      port: PORT,
      strictPort: true,
    },
  });

  await server.listen();

  return async () => {
    await server.close();
  };
}
