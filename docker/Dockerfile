# sorry for the mess in the docker file, it's a file I had before
FROM ubuntu:16.04
MAINTAINER Omar Islas "silgon3200@gmail.com"
ENV LANG C.UTF-8
RUN apt-get update && apt-get install --no-install-recommends -y \
    python3 python3-numpy python3-pandas python3-setuptools \
    python3-joblib python3-matplotlib python3-dev python3-pip\
    tk-dev python3-tk\
    liblapack-dev libopenblas-dev \
    build-essential autoconf libtool pkg-config libdsdp-5.8gf \
    libsuitesparse-dev libglpk36\
    g++ gfortran libblas-dev libffi-dev liblapack-dev libssl-dev libxft-dev less\
    && rm -rf /var/lib/apt/lists/*
ENV C_INCLUDE_PATH /usr/include/suitesparse/
RUN pip3 install -U pip setuptools==20.7.0 wheel && pip3 install seaborn rq ipython cvxopt \
    pandas_datareader iteration_utilities networkx flask flask_babel flask_cors\
    openpyxl mpld3 joblib gunicorn htmlmin pydocumentdb \
    matplotlib unidecode scikit-learn https://github.com/paolodragone/pymzn/archive/0.11.2.zip\
    && rm -rf /root/.cache/pip
