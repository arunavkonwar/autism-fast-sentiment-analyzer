import json
from pandas.io.json import json_normalize
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

def open_data( filename):
        with open(filename) as f:
                raw_json = json.load(f)

        fps = float(raw_json['framerate'])
        timescale = float(raw_json['timescale'])
        t = 0.0

        fragments = pd.DataFrame()
        for fi, f in enumerate(raw_json['fragments'] ):
                ff = json_normalize(f)
                ff['fragments_idx'] = fi
                t = ff['start'] /timescale

                events = pd.DataFrame()
                if 'events' in ff.columns:
                        for ei, e in enumerate(ff['events'][0]):
                                if(e):
                                        ef = json_normalize(e)
                                        ef['events_idx'] = ei
                                        ef['timestamp'] = t
                                        events = events.append(ef)
                                t += ff['interval']/timescale #1/fps

                        ff = ff.drop('events',1)
                        events['fragments_idx'] = fi
                        ff = ff.merge(events, on='fragments_idx', how='outer')
                else:
                        t += ff['duration']/timescale

                fragments = fragments.append(ff)

        fragments = fragments.fillna(method='pad')
        fragments = fragments.reset_index()
        fragments = fragments.set_index('timestamp')

        raw_json['fragments'] = fragments

        return raw_json

data = open_data('static/test.json')
fragments = data['fragments']

ax=None
ax = fragments[[
	u'scores.happiness',
	u'scores.surprise',
	u'scores.neutral',
	u'scores.anger',
    u'scores.disgust',
	u'scores.contempt',
    u'scores.sadness',
	u'scores.fear' ]].plot(ax=ax, legend=False, cmap=plt.get_cmap('Paired'), style='.')
plt.ylim( 0,1.1)
plt.legend(loc='upper left', prop={'size':10}, bbox_to_anchor=(1,1))
plt.tight_layout(pad=7)
plt.savefig("static/test.png")


# next part not working for some reason



fdic = fragments.to_dict("index")
keys = sorted(fdic.keys())

keys = [k for k in keys if not np.isnan(k)]
keys = sorted(keys)

data = []
pass_filter = ['scores.fear', 'y', 'width', 'scores.happiness', 'scores.neutral', 'fragments_idx', 'interval', 'scores.contempt', 'height', 'scores.disgust', 'start', 'scores.surprise', 'scores.sadness', 'events_idx', 'duration', 'x', 'scores.anger', 'id']
for idx in keys:
    tmp  = {"time": idx}
    for d in pass_filter:
        tmp[d] = fdic[idx][d]
    data.append(tmp)


output  = {"data": data}
json.dump(output, open('static/test_processed.json',"w"))
