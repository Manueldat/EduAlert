"""Run from project root: python -m ml.train. Reproducible synthetic experiment."""
import hashlib
import json
from datetime import datetime, timezone
import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.dummy import DummyClassifier
from sklearn.metrics import average_precision_score, roc_auc_score, brier_score_loss, precision_score, recall_score, f1_score, confusion_matrix
from sklearn.calibration import calibration_curve
from .common import ROOT, POLICY, FEATURES, label_event, probabilities

SEED = 2026
SPLITS = {'train':[2005,2008,2011], 'selection':[2014], 'calibration':[2017], 'threshold':[2020], 'test':[2023]}

def generate(n_per_cohort=280):
    rng = np.random.default_rng(SEED)
    rows=[]
    for split, cohorts in SPLITS.items():
        for cohort in cohorts:
            for sid in range(n_per_cohort):
                ability=rng.normal(2.4, .75); shock=0.; best={}; failures={}; history=[]; warning_count=0
                # Actual future marks are generated first; labels are computed from the NEXT term.
                for t in range(1,4):
                    debt=[c for c,g in best.items() if g<1]
                    chosen=debt[:2]+list(range((t-1)*6, t*6))[:6-min(2,len(debt))]
                    shock=.4*shock+rng.normal(0,.55)
                    grades=np.clip(ability+shock+rng.normal(0,.7,len(chosen)),0,4)
                    # Small random adverse events cause imperfect, genuinely uncertain future outcomes.
                    grades=np.where(rng.random(len(chosen))<.06,0,grades)
                    for c,g in zip(chosen,grades):
                        best[c]=max(best.get(c,0),float(g))
                        if g<1: failures[c]=failures.get(c,0)+1
                    debt=[c for c,g in best.items() if g<1]
                    gpa=float(np.mean(grades)); cpa=float(np.mean(list(best.values())))
                    f={'gpa':gpa,'cpa':cpa,'gpa_drop':history[-1]['gpa']-gpa if history else None,
                       'failed_ratio':float(np.mean(grades<1)), 'debt_credits':len(debt)*3,
                       'progress_ratio':sum(g>=1 for g in best.values())*3/(18*t),
                       'prereq_failures':max([failures[c] for c in debt if c%3==0] or [0]),'warning_count':warning_count}
                    # Synthetic historical decision flag, explicitly not a real school decision.
                    warning_count+=label_event(f)
                    f['warning_count']=warning_count
                    history.append(f)
                for t in [1,2]:
                    rows.append({'student_key':f'SYN-{cohort}-{sid:04}', 'cohort':cohort,'split':split,
                                 'feature_time':cohort*2+t,'target_time':cohort*2+t+1,'term':t,
                                 **history[t-1], 'y_next_demo_warning':label_event(history[t])})
    return pd.DataFrame(rows)

def metrics(y,p,threshold):
    pred=p>=threshold
    return {'n':len(y),'positive_rate':float(np.mean(y)), 'average_precision':float(average_precision_score(y,p)),
            'roc_auc':float(roc_auc_score(y,p)), 'brier':float(brier_score_loss(y,p)),
            'precision':float(precision_score(y,pred,zero_division=0)), 'recall':float(recall_score(y,pred,zero_division=0)),
            'f1':float(f1_score(y,pred,zero_division=0)), 'confusion_matrix_tn_fp_fn_tp':confusion_matrix(y,pred,labels=[0,1]).ravel().tolist()}

def main():
    (ROOT/'artifacts').mkdir(exist_ok=True);(ROOT/'reports').mkdir(exist_ok=True)
    data=generate(); data.to_csv(ROOT/'artifacts/training_rows.csv',index=False)
    parts={s:data[data.split==s].copy() for s in SPLITS}
    order=list(SPLITS)
    for a,b in zip(order,order[1:]):
        assert set(parts[a].student_key).isdisjoint(parts[b].student_key)
        assert parts[a].target_time.max()<parts[b].feature_time.min()
    X=lambda s: parts[s][FEATURES]
    y=lambda s: parts[s].y_next_demo_warning
    candidates={
      'LogisticRegression':Pipeline([('impute',SimpleImputer(strategy='median',add_indicator=True)),('scale',StandardScaler()),('model',LogisticRegression(max_iter=1500,random_state=SEED))]),
      'RandomForest':Pipeline([('impute',SimpleImputer(strategy='median',add_indicator=True)),('model',RandomForestClassifier(n_estimators=180,max_depth=7,min_samples_leaf=12,random_state=SEED,n_jobs=1))])}
    selection={}
    for name,model in candidates.items():
        model.fit(X('train'),y('train'))
        selection[name]=metrics(y('selection'),model.predict_proba(X('selection'))[:,1],.5)
    winner=max(selection,key=lambda n:selection[n]['average_precision'])
    model=candidates[winner]
    raw=np.clip(model.predict_proba(X('calibration'))[:,1],1e-6,1-1e-6)
    calibrator=LogisticRegression(C=1e6,max_iter=1000).fit(np.log(raw/(1-raw)).reshape(-1,1),y('calibration'))
    bundle={'model':model,'calibrator':calibrator,'medians':X('train').median().to_dict()}
    p=probabilities(bundle,X('threshold')); yt=y('threshold')
    grid=np.arange(.05,.96,.01)
    acceptable=[float(t) for t in grid if recall_score(yt,p>=t,zero_division=0)>=.85]
    yellow=max(acceptable) if acceptable else .05
    red_grid=[float(t) for t in grid if t>=yellow+.10]
    red=max(red_grid,key=lambda t:f1_score(yt,p>=t,zero_division=0)) if red_grid else .95
    yellow=min(yellow,red-.05)
    thresholds={'yellow':round(yellow,3),'red':round(red,3)}
    testp=probabilities(bundle,X('test'))
    frac,mean=calibration_curve(y('test'),testp,n_bins=8,strategy='quantile')
    baseline=DummyClassifier(strategy='prior').fit(X('train'),y('train'))
    data_hash=hashlib.sha256((ROOT/'artifacts/training_rows.csv').read_bytes()).hexdigest()
    version=f'synthetic-v1-{data_hash[:8]}-{winner.lower()}'
    info={'modelVersion':version,'featureSchema':'academic-v1','policyVersion':POLICY['version'], 'dataType':'SYNTHETIC',
      
      'target':'Thỏa ít nhất một điều kiện cảnh báo DEMO ở học kỳ kế tiếp',
      'algorithm':winner,'features':FEATURES,'thresholds':thresholds,
      'selectionMetrics':selection,'test':metrics(y('test'),testp,red),'testAtYellow':metrics(y('test'),testp,yellow),
      'dummyBaseline':metrics(y('test'),baseline.predict_proba(X('test'))[:,1],.5),
      'calibration':{'mean_predicted':mean.tolist(),'observed_fraction':frac.tolist()},
      'splitCounts':{k:{'rows':len(v),'students':v.student_key.nunique(),'feature_time_min':int(v.feature_time.min()),'target_time_max':int(v.target_time.max())} for k,v in parts.items()},
      'dataSha256':data_hash,'sklearnVersion':sklearn.__version__,'seed':SEED,
      'createdAt':datetime.now(timezone.utc).isoformat(),
      'thresholdMethod':'Yellow: largest threshold with validation recall >= .85; red: best validation F1 >= yellow + .10. Test set untouched.',
      'cpaPolicy':POLICY['cpaRule']}
    bundle['info']=info
    joblib.dump(bundle,ROOT/'artifacts/model.joblib')
    (ROOT/'artifacts/model-info.json').write_text(json.dumps(info,ensure_ascii=False,indent=2),encoding='utf-8')
    (ROOT/'reports/ml-metrics.json').write_text(json.dumps(info,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'model':winner,'thresholds':thresholds,'test':info['test']},indent=2))

if __name__=='__main__':main()
