#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PaddleOCR 表格识别脚本
接收图片路径，返回 OCR 识别结果（文本和单词位置信息）
"""

import sys
import json
import os

# 禁用模型源检查警告（必须在导入 PaddleOCR 之前设置）
# 同时设置环境变量，确保在子进程中也生效
os.environ['DISABLE_MODEL_SOURCE_CHECK'] = 'True'
os.putenv('DISABLE_MODEL_SOURCE_CHECK', 'True')

try:
    from paddleocr import PaddleOCR
except ImportError:
    print(json.dumps({
        "error": "PaddleOCR 未安装",
        "message": "请运行: pip install paddlepaddle paddleocr"
    }), file=sys.stderr)
    sys.exit(1)


def recognize_image(image_path):
    """
    识别图片中的文字和表格

    Args:
        image_path: 图片文件路径

    Returns:
        dict: 包含 text 和 words 的字典
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"图片文件不存在: {image_path}")

    # 初始化 PaddleOCR
    # use_textline_orientation=True 表示使用文本行方向检测（新版本 API）
    # lang='ch' 表示使用中文模型
    # 确保环境变量已设置（在导入前已设置，这里再次确认）
    if 'DISABLE_MODEL_SOURCE_CHECK' not in os.environ:
        os.environ['DISABLE_MODEL_SOURCE_CHECK'] = 'True'

    try:
        # 尝试使用新版本 API
        ocr = PaddleOCR(use_textline_orientation=True, lang='ch')
    except TypeError:
        # 如果新版本 API 不支持，回退到旧版本
        try:
            ocr = PaddleOCR(use_angle_cls=True, lang='ch')
        except TypeError:
            # 如果都不支持，使用最简单的初始化
            ocr = PaddleOCR(lang='ch')

    # 执行 OCR 识别
    # 新版本 PaddleOCR 的 ocr 方法不支持 cls 参数
    result = ocr.ocr(image_path)

    # 解析结果
    text_lines = []
    words = []

    # 处理不同版本的返回格式
    ocr_data = None
    if isinstance(result, list) and len(result) > 0:
        # result 是列表，result[0] 是 OCRResult 对象（新版本）
        ocr_data = result[0]
    elif hasattr(result, 'rec_texts') or hasattr(result, 'dt_polys'):
        # 直接是 OCRResult 对象
        ocr_data = result
    else:
        ocr_data = result

    # 处理新版本的 OCRResult 格式（使用字典访问）
    if isinstance(ocr_data, dict) or (hasattr(ocr_data, 'get') and hasattr(ocr_data, 'keys')):
        # 新版本格式：OCRResult 对象可以像字典一样访问
        rec_texts = ocr_data.get('rec_texts', []) if hasattr(ocr_data, 'get') else (ocr_data['rec_texts'] if 'rec_texts' in ocr_data else [])
        rec_scores = ocr_data.get('rec_scores', []) if hasattr(ocr_data, 'get') else (ocr_data['rec_scores'] if 'rec_scores' in ocr_data else [])
        dt_polys = ocr_data.get('dt_polys', []) if hasattr(ocr_data, 'get') else (ocr_data['dt_polys'] if 'dt_polys' in ocr_data else [])

        # 确保是列表
        if not isinstance(rec_texts, list):
            rec_texts = [rec_texts] if rec_texts else []
        if not isinstance(rec_scores, list):
            rec_scores = [rec_scores] if rec_scores else [1.0] * len(rec_texts)
        if not isinstance(dt_polys, list):
            dt_polys = [dt_polys] if dt_polys else []

        # 处理每个识别结果
        for i, text in enumerate(rec_texts):
            if not text:
                continue

            text_str = str(text).strip()
            if not text_str:
                continue

            text_lines.append(text_str)

            # 获取对应的坐标和置信度
            poly = dt_polys[i] if i < len(dt_polys) else None
            score = rec_scores[i] if i < len(rec_scores) else 1.0

            # 处理 numpy 数组格式的坐标
            if poly is not None:
                try:
                    import numpy as np
                    if isinstance(poly, np.ndarray):
                        poly = poly.tolist()
                except:
                    pass

                if isinstance(poly, list) and len(poly) >= 4:
                    # 计算边界框
                    try:
                        x_coords = []
                        y_coords = []
                        for point in poly:
                            if isinstance(point, (list, tuple)) and len(point) >= 2:
                                x_coords.append(float(point[0]))
                                y_coords.append(float(point[1]))
                            elif hasattr(point, '__getitem__'):
                                try:
                                    x_coords.append(float(point[0]))
                                    y_coords.append(float(point[1]))
                                except:
                                    pass

                        if x_coords and y_coords:
                            words.append({
                                "text": text_str,
                                "bbox": {
                                    "x0": float(min(x_coords)),
                                    "y0": float(min(y_coords)),
                                    "x1": float(max(x_coords)),
                                    "y1": float(max(y_coords))
                                },
                                "confidence": float(score) if score else 1.0
                            })
                    except Exception as e:
                        # 如果坐标解析失败，仍然添加文本，但不添加坐标
                        pass

    # 处理旧版本的列表格式
    elif isinstance(ocr_data, list):
        for line in ocr_data:
            if line and len(line) >= 2:
                try:
                    # line[0] 是坐标信息，line[1] 是 (文本, 置信度)
                    coordinates = line[0]  # [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
                    text_info = line[1]

                    # 验证数据结构
                    if not coordinates or not text_info:
                        continue

                    # 安全获取文本和置信度
                    if isinstance(text_info, (list, tuple)) and len(text_info) >= 2:
                        text = str(text_info[0]) if text_info[0] else ""
                        confidence = float(text_info[1]) if len(text_info) > 1 else 0.0
                    elif isinstance(text_info, (list, tuple)) and len(text_info) >= 1:
                        text = str(text_info[0]) if text_info[0] else ""
                        confidence = 0.0
                    else:
                        # 如果格式不符合预期，跳过
                        continue

                    # 验证坐标数据
                    if not isinstance(coordinates, (list, tuple)) or len(coordinates) < 2:
                        continue

                    # 计算边界框
                    try:
                        x_coords = [point[0] for point in coordinates if isinstance(point, (list, tuple)) and len(point) >= 2]
                        y_coords = [point[1] for point in coordinates if isinstance(point, (list, tuple)) and len(point) >= 2]

                        if not x_coords or not y_coords:
                            continue

                        x0 = min(x_coords)
                        y0 = min(y_coords)
                        x1 = max(x_coords)
                        y1 = max(y_coords)
                    except (ValueError, TypeError, IndexError) as e:
                        # 如果坐标解析失败，跳过这一行
                        continue

                    # 添加到文本行
                    if text:
                        text_lines.append(text)

                    # 添加到单词列表（用于表格结构分析）
                    words.append({
                        "text": text,
                        "bbox": {
                            "x0": float(x0),
                            "y0": float(y0),
                            "x1": float(x1),
                            "y1": float(y1)
                        },
                        "confidence": float(confidence)
                    })
                except (IndexError, TypeError, ValueError) as e:
                    # 如果解析失败，跳过这一行，继续处理下一行
                    continue

    # 合并文本
    full_text = "\n".join(text_lines)

    return {
        "text": full_text,
        "words": words,
        "lineCount": len(text_lines),
        "wordCount": len(words)
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        error = {
            "error": "参数错误",
            "message": "用法: python3 paddleocr_recognize.py <图片路径1> [图片路径2] ..."
        }
        print(json.dumps(error), file=sys.stderr)
        sys.exit(1)

    image_paths = sys.argv[1:]

    try:
        # 如果只有一张图片，直接识别
        if len(image_paths) == 1:
            result = recognize_image(image_paths[0])
            print(json.dumps(result, ensure_ascii=False))
        else:
            # 多张图片：合并所有结果
            all_text_lines = []
            all_words = []
            total_line_count = 0
            total_word_count = 0

            for idx, image_path in enumerate(image_paths):
                print(f"处理图片 {idx + 1}/{len(image_paths)}: {image_path}", file=sys.stderr)
                result = recognize_image(image_path)

                # 合并文本行（添加分隔符区分不同图片）
                if result.get('text'):
                    all_text_lines.append(f"--- 图片 {idx + 1} ---")
                    all_text_lines.extend(result.get('text', '').split('\n'))
                    all_text_lines.append('')  # 空行分隔

                # 合并单词（保持原有结构）
                if result.get('words'):
                    all_words.extend(result.get('words', []))

                total_line_count += result.get('lineCount', 0)
                total_word_count += result.get('wordCount', 0)

            # 合并结果
            merged_result = {
                "text": "\n".join(all_text_lines),
                "words": all_words,
                "lineCount": total_line_count,
                "wordCount": total_word_count,
                "imageCount": len(image_paths)
            }

            print(json.dumps(merged_result, ensure_ascii=False))
    except Exception as e:
        error = {
            "error": str(e),
            "message": "OCR 识别失败"
        }
        print(json.dumps(error), file=sys.stderr)
        sys.exit(1)

