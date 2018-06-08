#!/usr/bin/env python
# -*- coding: utf-8 -*-
from flask import Flask, render_template, json, request, make_response, redirect, g
app = Flask(__name__)

@app.route("/")
def home():
    return render_template('index.tmpl')

if __name__ == "__main__":
    app.jinja_env.auto_reload = True
    app.config['TEMPLATES_AUTO_RELOAD'] = True
    app.run(debug=True, host='0.0.0.0')
