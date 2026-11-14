import os
import secrets
from contextlib import asynccontextmanager
import joblib
import pandas as pd
import sklearn
from fastapi import FastAPI, Header, HTTPException, Depends
from pydantic import BaseModel, Field, ConfigDict
from .common import ROOT, FEATURES, LABELS, POLICY, load_env, probabilities, risk_level
load_env()
bundle=None

@asynccontextmanager
async def lifespan(app):
    global bundle
    if not os.getenv('ML_API_KEY'):raise RuntimeError('Chạy npm run setup trước để có ML_API_KEY')
    model_path=ROOT/'artifacts/model.joblib'
    if model_path.exists():
        bundle=joblib.load(model_path)  # Only the artifact produced locally by ml.train is trusted.
        if bundle['info']['sklearnVersion']!=sklearn.__version__:
            raise RuntimeError('Phiên bản scikit-learn khác lúc train. Cài requirements rồi train lại.')
    yield

app=FastAPI(title='EduAlert ML — synthetic demo',version='1.0.0',lifespan=lifespan)
def authorize(x_ml_key:str=Header(default='')):
    expected=os.getenv('ML_API_KEY','')
    if not expected or not secrets.compare_digest(x_ml_key,expected):raise HTTPException(401,'Invalid service key')

class Features(BaseModel):
    model_config=ConfigDict(extra='forbid',allow_inf_nan=False)
    gpa:float=Field(ge=0,le=4)
    cpa:float=Field(ge=0,le=4)
    gpa_drop:float|None=Field(default=None,ge=-4,le=4)
    failed_ratio:float=Field(ge=0,le=1)
    debt_credits:int=Field(ge=0,le=300)
    progress_ratio:float=Field(ge=0,le=5)
    prereq_failures:int=Field(ge=0,le=30)
    warning_count:int=Field(ge=0,le=30)

class PredictRequest(BaseModel):
    model_config=ConfigDict(extra='forbid')
    features:Features

@app.get('/health')
def health():return {'status':'ok' if bundle else 'model_missing'}

@app.get('/model-info',dependencies=[Depends(authorize)])
def info():
    if bundle is None:raise HTTPException(503,'Run python -m ml.train first')
    return bundle['info']

@app.post('/predict',dependencies=[Depends(authorize)])
def predict(body:PredictRequest):
    if bundle is None:raise HTTPException(503,'Model unavailable')
    if bundle['info']['policyVersion']!=POLICY['version']:raise HTTPException(503,'Policy changed; retrain first')
    row=pd.DataFrame([body.features.model_dump()],columns=FEATURES)
    p=float(probabilities(bundle,row)[0]);changes=[]
    for name,label in zip(FEATURES,LABELS):
        alt=row.copy();alt[name]=bundle['medians'][name]
        delta=p-float(probabilities(bundle,alt)[0])
        changes.append({'feature':name,'label':label,'delta':round(delta,5),'reference':float(bundle['medians'][name])})
    changes.sort(key=lambda x:abs(x['delta']),reverse=True)
    return {'probability':p,'level':risk_level(p,bundle['info']['thresholds']), 'thresholds':bundle['info']['thresholds'],
            'modelVersion':bundle['info']['modelVersion'],'featureSchema':'academic-v1','policyVersion':POLICY['version'],
            'dataType':'SYNTHETIC','explanation':changes,
            'explanationMethod':'Độ nhạy: điểm hiện tại trừ điểm khi thay riêng đặc trưng bằng trung vị tập train. Không cộng dồn và không phải tác động nhân quả.'}
