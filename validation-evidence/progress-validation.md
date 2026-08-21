# Validação de progresso de imagens

O cenário ponta a ponta executado em 21 de agosto de 2026 registrou as barras em estados ativos com respostas simuladas temporizadas, sem depender de serviços de IA externos.

| Fluxo | Tela | Estágios confirmados | Acessibilidade confirmada |
|---|---|---|---|
| Foto de rosto | Desktop | Preparando (20%), Enviando (54%), Analisando (84%) | `role="status"`, `aria-live="polite"`, `role="progressbar"` e texto de detalhe |
| Imagem de cena | Mobile | Preparando (24%), Enviando (68%), Lendo direção visual (84%) | `role="status"`, `aria-live="polite"`, `role="progressbar"` e texto de detalhe |

As capturas `face-analyzing-desktop.png` e `scene-analyzing-mobile.png` preservam a aparência das barras durante a análise. O relatório estruturado correspondente está em `progress-e2e-report.json`.
