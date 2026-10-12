# Plate-check models

PaddleOCR PP-OCRv4 text detection (`ch_PP-OCRv4_det_infer.onnx`) and recognition
(`ch_PP-OCRv4_rec_infer.onnx`), ONNX exports from https://huggingface.co/SWHL/RapidOCR.
Apache License 2.0 (PaddleOCR). Used by `src/app/plate-worker.ts`; accuracy is
measured by `eval/plate_eval.py`.
