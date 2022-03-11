# font-face

## 前言

font-face 同个名字 不同粗细写法

### 实践

```css
@font-face {
    font-family: "DejaVu Sans";
    src: url("fonts/DejaVuSans.ttf");
}
@font-face {
    font-family: "DejaVu Sans";
    src: url("fonts/DejaVuSans-Bold.ttf");
    font-weight: bold;
}
@font-face {
    font-family: "DejaVu Sans";
    src: url("fonts/DejaVuSans-Oblique.ttf");
    font-style: italic, oblique;
}
@font-face {
    font-family: "DejaVu Sans";
    src: url("fonts/DejaVuSans-BoldOblique.ttf");
    font-weight: bold;
    font-style: italic, oblique;
}
```

### css2

```css
@font-face {
    font-family: 'DejaVu Sans';
    src: url('dejavu/DejaVuSans.ttf'); /* IE9 Compat Modes */
    src:
        local('DejaVu Sans'),
        local('DejaVu-Sans'), /* Duplicated name with hyphen */
        url('dejavu/DejaVuSans.ttf')
        format('truetype');
}
/*bold version*/
@font-face {
    font-family: 'DejaVu Sans';
    src: url('dejavu/DejaVuSans-Bold.ttf');
    src:
        local('DejaVu Sans'),
        local('DejaVu-Sans'),
        url('dejavu/DejaVuSans-Bold.ttf')
        format('truetype');
    font-weight: bold;
}
/*italic version*/
@font-face {
    font-family: 'DejaVu Sans';
    src: url('dejavu/DejaVuSans-Oblique.ttf');
    src:
        local('DejaVu Sans'),
        local('DejaVu-Sans'),
        url('dejavu/DejaVuSans-Oblique.ttf')
        format('truetype');
    font-style: italic;
}
/*bold italic version*/
@font-face {
    font-family: 'DejaVu Sans';
    src: url('dejavu/DejaVuSans-BoldOblique.ttf');
    src:
        local('DejaVu Sans'),
        local('DejaVu-Sans'),
        url('dejavu/DejaVuSans-BoldOblique.ttf')
        format('truetype');
    font-weight: bold;
    font-style: italic;
}
`

## 总结

### 参考文献
