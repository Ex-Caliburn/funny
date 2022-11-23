/*
 *   中文，英语正则过滤
 *   eg：REG_CHINESE 是用来替换非中文字符的
 *   例外:  "'‘’“” 不需要区分中英文 => 英文要区分，中文不区分
 */
export const REG_CHINESE = /[^\u4E00-\u9FA5\s\d~`@#$\\/|%^&*()（）\-_+=[\]{}！；：。， 、"'‘’“”<.>《》{}？]/g
export const REG_ENGLISH = /[^a-zA-Z\s\d~`@#$\\/|%^&*()（）\-_+=[\]{}!;:"'‘’“”, <.>《》{}?\n\r]/g

export const REG_HAVE_CHINESE = /[\u4E00-\u9FA5]+/g
export const REG_HAVE_ENGLISH = /[a-zA-Z]+/g


// 选词填空正则  ⑴...⒇
export const CHOOSE_FILL_BLANK_REG = /[\u2474-\u2487]/g

/* 填空匹配正则  带圆圈数字 ①... */
export const FILL_BLANK_REG = /[\u2460-\u2479]/g

/* 微信appID正则 */
export const APP_ID_REG = /^wx(?=.*\d)(?=.*[a-z])[\da-z]{16}$/

// 各种特殊字符 ASCII码，160
/* eslint-disable */
export const BAD_CHAR_REG = /\u2028|\u2029|\u8232|\u00a0|\u00A0|\ufeff｜﻿/g
/* eslint-disable */