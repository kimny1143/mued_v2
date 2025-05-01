# Pythonパッケージとして認識されるために必要な空の__init__.pyファイル
import os
import sys

# テストディレクトリのパスを追加
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__)))) 