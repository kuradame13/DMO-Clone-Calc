# DigiClone Calculator — DMO

<img src="assets/icon-192.png" width="88" align="right" alt="Ícone do DigiClone Calculator" />

**App online:** https://kuradame13.github.io/DMO-Clone-Calc/

Calculadora de clone perfeito para **Digimon Masters Online**, feita como web app mobile-first (HTML/CSS/JS puro, sem dependências). Pode ser instalada no celular como PWA (menu do navegador → “Adicionar à tela inicial”).

## O que ela faz

- Seleciona o status: **Ataque, Crítico, Bloqueio, Evasão ou Vida**.
- Campo para o **valor base** do status (o número branco, sem o bônus verde).
- Seleção do **nível do clone** (1 a 15).
- **Calcular** mostra o bônus de clone e o total com clone.
- **Limpar** reseta tudo.
- Tabela de referência completa embutida (destaca a linha/coluna calculada).
- Bloqueio é tratado como valor fixo (não escala com o base), igual à wiki.
- Vida avisa que só fica disponível após a Transcendência.

## Rodar localmente

```bash
cd DMO-Clone-Calc
python3 -m http.server 8000
```

Abra `http://localhost:8000`.

## Estrutura

```
index.html            # tela
styles.css            # visual
app.js                # tabela + lógica + interação
manifest.webmanifest  # metadados (instalável como PWA)
assets/               # ícones PNG (32, 180, 192, 512 e 1024 px)
```

## Ícone

O arquivo **`assets/icon-1024.png`** é o indicado para o **App Icon do bot no Discord** (o Discord pede no mínimo 512×512). A mesma arte está em 512, 192, 180 e 32 px para PWA e favicon.

## Próximo passo: APK

A base já está pronta para empacotar em WebView. O caminho mais simples é **Capacitor**:

```bash
npm init -y
npm i @capacitor/core @capacitor/cli @capacitor/android
npx cap init "DigiClone Calculator" com.seunome.digiclone --web-dir=.
npx cap add android
npx cap sync
npx cap open android
```

Depois é só gerar o APK assinado no Android Studio (`Build > Generate Signed Bundle / APK`). Como o app não usa internet nem permissões especiais, funciona 100% offline.
