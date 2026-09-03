# Aurora Pizza OS — Front-end

Interface React + Vite do Aurora Pizza OS.

```cmd
npm install
npm start
```

Abra `http://localhost:3000`.

Validação:

```cmd
npm test
npm run build
```

Para apontar para uma API diferente antes do `npm start`:

```cmd
set VITE_API_URL=http://localhost:8081/api
set VITE_WS_URL=ws://localhost:8081/ws/orders
```

Se a API não estiver disponível, o sistema oferece modo de demonstração local e mantém pedidos pendentes para sincronizar quando a conexão voltar.
