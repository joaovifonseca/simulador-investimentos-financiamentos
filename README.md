# Instagram Non-Followers — GitHub Pages Simulators

> Simuladores estáticos para desenvolvimento e demonstração do projeto "instagram-non-followers".

## Descrição

Esta pasta contém uma versão estática (simulador) que permite visualizar e testar a interface web usada pelo projeto principal. Útil para demos rápidas, desenvolvimento frontend e publicação no GitHub Pages.

## Conteúdo

- `index.html` — página principal do simulador.
- `page.css` — estilos da interface.
- `page.js` — lógica do frontend usada no simulador.

## Uso (desenvolvimento local)

1. Abra `index.html` diretamente no navegador (funciona para testes simples).
2. Para um servidor local (recomendado), execute na pasta do projeto:

```bash
python3 -m http.server 8000
# ou
npm install -g http-server && http-server -p 8000
```

Então acesse: http://localhost:8000

## Publicar no GitHub Pages

Opções rápidas:

- Configure o repositório para usar a branch `gh-pages` e publique os arquivos estáticos.
- Ou coloque os arquivos na pasta `docs/` da branch `main` e ative o GitHub Pages nas configurações do repositório.

## Observações

- Este diretório é apenas um simulador/preview estático — não é a extensão Chrome completa.
- Para integração com a extensão ou backend, consulte o repositório principal do projeto.

## Contribuição

Sinta-se à vontade para abrir issues ou pull requests com correções, melhorias de layout ou ajustes nas instruções de deploy.

## Licença

Licença do projeto principal (ver repositório principal). Se não houver um arquivo de licença aqui, pergunte ao mantenedor.
