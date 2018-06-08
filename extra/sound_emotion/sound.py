import pandas as pd
import os
import librosa
import numpy as np
import librosa
import librosa.display
import numpy as np
import matplotlib.pyplot as plt
import keras
import json


has_vedio = True

if has_vedio:
    os.system("ffmpeg -i {} -ab 160k -ac 2 -ar 44100 -vn test.wav".format('test.mp4'))



model = keras.models.load_model('saved_models/Emotion_Voice_Detection_Model.h5')

def output(a):
    bad = a[0]+a[5]+a[2]+a[7]
    good = a[3] +a[8]
    calm = a[1] + a[6]
    return {'good':str(good),'bad':str(bad), 'calm':str(calm)}


X, sample_rate = librosa.load('test.wav', res_type='kaiser_fast',sr=22050*2,offset=0.5)
sample_rate = np.array(sample_rate)
mfccs = np.mean(librosa.feature.mfcc(y=X,sr=sample_rate,n_mfcc=13),axis=0)

all_ticks = False
test = []
if all_ticks:
    for i in range(mfccs.shape[0] - 216):
        test.append(mfccs[i:i+216])
else:
    i = 0
    while i <= (mfccs.shape[0] - 216)/30:
        test.append(mfccs[i*30:i*30+216])
        i+=1

test = np.array(test)
out2 = model.predict(test[:,:,np.newaxis])
j = []
for i in out2:
    j.append(output(i))


with open('boi_audio.json','w') as jj:
    json.dump(j,jj)

bad = []
calm = []
good= []
for i in j:
    bad.append(float(i['bad']))
    calm.append(float(i['calm']))
    good.append(float(i['good']))

plt.plot(bad,label='bad',alpha= 0.4)
plt.plot(calm,label='calm',alpha= 0.4)
plt.plot(good,label='good',alpha= 0.6)
plt.legend()
plt.show()
