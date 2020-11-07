# markdown-ruby

## 项目介绍
> 本项目库基于[furigana-markdown](https://github.com/amclees/furigana-markdown)修改而来！
目标是为Markdown文档预览时可以体现注音符号。

## Markdown注音符号格式展示说明

#### Basic Furigana
By default, the following formats can be used.
```
[世界]^(せかい)
[世界]{せかい}
```
produces

![sample_output](./images/sample_sekai.png)

#### Inline/Auto-matching Furigana
By default, inline matching can also be used. It only works above kanji however.
```
世界【せかい】
世界{せかい}
```
produces

![sample_output](./images/sample_sekai.png)

#### Seperate Furigana for each Kanji
By default, furigana is displayed equally spaced above each kanji. Using any of the seperators `. ． 。 ・`, spacing can be specified (only in the inline format).
```
小夜時雨【さ・よ・しぐれ】
```
produces

![sample_output](./images/sample_sayoshigure.png)

#### Pattern Matching Furigana
Pattern matching, enabled by default, also allows the following formats,
in which the whole word can be added in kana to the furigana.
```
食べる【たべる】
食べる{たべる}
```
produces

![sample_output](./images/sample_taberu.png)

By using the basic furigana format, compound words can be matched too.
```
[取り返す]{とりかえす}
```
produces

![sample_output](./images/sample_torikaesu.png)

This makes it easier to get the kanji version of the word from an IME without backtracking through the text to place furigana.

## 安装
```
npm install
```

## 使用
```
import MDRubyRender from 'markdown-ruby'
```
### marked
```
var renderer = new marked.Renderer()
MDRubyRender.registerMarked(renderer);
```