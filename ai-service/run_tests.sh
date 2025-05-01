#!/bin/bash

# PYTHONPATHを設定して、テストディレクトリとアプリケーションディレクトリを含める
export PYTHONPATH=$(pwd):$(pwd)/app

# pytestを実行
echo "Running tests with PYTHONPATH=$PYTHONPATH"
pytest -xvs "$@" 