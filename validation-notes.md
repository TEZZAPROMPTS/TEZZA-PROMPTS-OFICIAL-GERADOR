# Validation Notes

- Em 2026-08-21, a rota pública `POST /api/upload-image` recebeu uma imagem PNG por `multipart/form-data` no navegador e devolveu JSON com `key`, `url`, `contentType` e `size` (HTTP 201).
- Em 2026-08-21, o fluxo de rosto foi validado no navegador com upload multipart seguido de extração automática. O campo **Traços e restrições obrigatórias** foi preenchido com valores em inglês e não houve mensagem `Unexpected token '<'` nem retorno HTML do gateway.
- A alternância para o modo Foto foi verificada após a extração, preservando o rosto enviado e o texto editável de traços enquanto a imagem de cena aguarda envio separado.
- No modo Foto, uma imagem de cena foi enviada com sucesso por multipart, recebeu prévia local independente e habilitou a ação de geração sem reintroduzir dados de imagem no corpo da mutação.
- A ação de geração multimodal foi acionada após as duas referências seguras estarem disponíveis; a resposta assíncrona do modelo permanece em validação nesta etapa.
- A geração multimodal foi concluída no navegador com sucesso. O resultado em inglês trouxe a abertura fixa do Método Feminino, as 14 seções na ordem esperada, o fechamento fixo e os traços de rosto extraídos; não houve resposta HTML nem erro de JSON do gateway.
