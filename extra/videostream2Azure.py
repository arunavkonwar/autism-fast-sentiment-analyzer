import requests
import cv2
import time
import io
import json


vedio = './data/input_video.mp4'
subscription_key = "key-in-string"


assert subscription_key
url = 'https://northeurope.api.cognitive.microsoft.com/face/v1.0/detect'
headers = {
    'ocp-apim-subscription-key': subscription_key,
    'Content-Type': "application/octet-stream",
    'cache-control': "no-cache",
}

params = {
    'returnFaceId': 'true',
    'returnFaceLandmarks': 'false',
    'returnFaceAttributes': 'age,gender,headPose,smile,facialHair,glasses,' +
                            'emotion,hair,makeup,occlusion,accessories,blur,exposure,noise'
}

start = time.time()
j = []
vidcap = cv2.VideoCapture(vedio)
success,image = vidcap.read()
dd = cv2.imencode('.jpg', image)[1]
response = requests.post(url, headers=headers, params = params,data=io.BytesIO(dd.tobytes()))
j += eval(response.text.replace('false','False'))
count = 0
success = True

while success:
    success,image = vidcap.read()
    dd = cv2.imencode('.jpg', image)[1]
    response = requests.post(url, headers=headers, params = params,data=io.BytesIO(dd.tobytes()))
    j += eval(response.text.replace('false','False'))
    #     print('Read a new frame: ', success)
    count += 1

print('capture {} times'.format(count+1))
print('using {} s'.format(time.time() - start))

with open('out.json', 'w') as outfile:
    json.dump(j, outfile)
