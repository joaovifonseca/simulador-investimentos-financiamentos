# Simulador de Financiamentos e Investimentos — GitHub Pages

> Simulador estático para testar e demonstrar cálculos e interfaces de financiamentos e investimentos.

## Descrição

Este diretório contém uma versão estática do simulador que permite:

- Calcular parcelas de financiamentos (sistema PRICE/SAC ou personalizável).
- Simular trajetórias de investimentos (rendimento simples, composto, taxas prefixadas e atreladas).
- Ajustar parâmetros como valor, prazo, taxa e periodicidade para ver resultados instantâneos.

O objetivo é servir como preview UI para desenvolvimento frontend, demos e publicação no GitHub Pages.

## Conteúdo

- `index.html` — interface do simulador.
- `page.css` — estilos da interface.
- `page.js` — lógica dos cálculos e interação (edite para ajustar parâmetros padrão).

## Como usar (desenvolvimento local)

1. Abra `index.html` diretamente no navegador para testes rápidos.
2. Para rodar um servidor local (recomendado), execute na pasta do projeto:

```bash
python3 -m http.server 8000
# ou
npm install -g http-server && http-server -p 8000
```

Acesse: http://localhost:8000

## Personalização rápida

- Altere valores padrão e fórmulas em `page.js` para adaptar o simulador às regras desejadas.
- Para adicionar novos tipos de simulação (ex.: amortização diferenciada), estenda a lógica em `page.js` e atualize o HTML conforme necessário.

## Publicação no GitHub Pages

Opções:

- Publique a pasta diretamente em uma branch `gh-pages`.
- Ou mova os arquivos para `docs/` na branch `main` e ative o GitHub Pages nas configurações.

## Observações

- Este é um simulador estático — não executa validações fiscais ou financeiras oficiais. Use apenas para demonstração e prototipagem.
- Para integração com backend, bancos de dados ou a versão final da aplicação, consulte o repositório principal do projeto.

## Contribuição

Abra issues ou PRs para correções, novos cenários de simulação, melhorias de UX ou exemplos de casos de uso.

## Licença

Ver licença do repositório principal. Se necessário, adicione um `LICENSE` neste diretório.
