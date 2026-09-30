// src/plugins/lucacAudio/audioEngine.ts

export const LUCAC_WORKLET = `
const SCALES=[
    [0,1,2,3,4,5,6,7,8,9,10,11],
    [0,2,4,5,7,9,11],
    [0,2,3,5,7,8,10],
    [0,2,4,7,9],
];
class LucacEngine extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name:'preGain',defaultValue:1,min:0.001,max:5000 },
            { name:'drive',defaultValue:0,min:0,max:1 },
            { name:'crush',defaultValue:0,min:0,max:1 },
            { name:'width',defaultValue:0,min:0,max:2 },
            { name:'postGain',defaultValue:1,min:0.001,max:5000 },
            { name:'eqBass',defaultValue:0,min:-12,max:12 },
            { name:'eqMid',defaultValue:0,min:-12,max:12 },
            { name:'eqTreble',defaultValue:0,min:-12,max:12 },
            { name:'voicePitch',defaultValue:1,min:-100,max:2.5 },
            { name:'voiceFormant',defaultValue:1,min:0.3,max:2.0 },
            { name:'voiceMix',defaultValue:0,min:0,max:1 },
            { name:'autotuneOn',defaultValue:0,min:0,max:1 },
            { name:'autotuneSpeed',defaultValue:0.3,min:0,max:1 },
            { name:'autotuneScale',defaultValue:0,min:0,max:3 },
            { name:'balance',defaultValue:0.5,min:0,max:1 },
            { name:'pan',defaultValue:0,min:-1,max:1 },
            { name:'muteLeft',defaultValue:0,min:0,max:1 },
            { name:'muteRight',defaultValue:0,min:0,max:1 },
            { name:'soloLeft',defaultValue:0,min:0,max:1 },
            { name:'soloRight',defaultValue:0,min:0,max:1 },
            { name:'noiseGateOn',defaultValue:0,min:0,max:1 },
            { name:'noiseGateThreshold',defaultValue:0.02,min:0,max:0.5 },
            { name:'godMode',defaultValue:0,min:0,max:1 },
            { name:'reverbMix',defaultValue:0,min:0,max:1 },
            { name:'reverbDecay',defaultValue:0.5,min:0,max:0.99 },
            { name:'satMode',defaultValue:0,min:0,max:1 },
            { name:'echoMix',defaultValue:0,min:0,max:1 },
            { name:'echoTime',defaultValue:0.3,min:0.05,max:1.5 },
            { name:'echoFeedback',defaultValue:0.35,min:0,max:0.9 }
        ];
    }
    constructor(){
        super();
        this._limL=1;this._limR=1;this._sweepPhase=0;this._signalPhase=0;
        this._delayBufferL=new Float32Array(3000);this._delayBufferR=new Float32Array(3000);
        this._writePtr=0;this._lpL0=0;this._lpL1=0;this._lpR0=0;this._lpR1=0;this._subPhase=0;
        this._eqL={low:0,mid:0,high:0};this._eqR={low:0,mid:0,high:0};
        this._pitchBufferSize=8192;
        this._pitchBufferL=new Float32Array(this._pitchBufferSize);
        this._pitchBufferR=new Float32Array(this._pitchBufferSize);
        this._pWritePtr=0;this._pReadPtrL=0.0;this._pReadPtrR=0.0;
        this._atBufSize=2048;
        this._atBufL=new Float32Array(this._atBufSize);
        this._atBufR=new Float32Array(this._atBufSize);
        this._atWritePtr=0;this._atDetectedFreq=220;this._atTargetRatio=1.0;
        this._atCurrentRatio=1.0;this._atDetectCounter=0;this._atDetectInterval=128;
        this._atShiftBufSize=8192;
        this._atShiftBufL=new Float32Array(this._atShiftBufSize);
        this._atShiftBufR=new Float32Array(this._atShiftBufSize);
        this._atShiftWritePtr=0;this._atShiftReadPtrL=0.0;this._atShiftReadPtrR=0.0;
        this._gateGain=1.0;this._gateEnvL=0;this._gateEnvR=0;this._godEnv=1;
        this._rvbBufs=[new Float32Array(8000),new Float32Array(8000),new Float32Array(8000),new Float32Array(8000)];
        this._rvbWPtr=0;this._rvbFilters=[0,0,0,0];this._rvbDelays=[1440,2640,4080,6000];this._rvbSize=8000;
        this._echoBufL=new Float32Array(96000);
        this._echoBufR=new Float32Array(96000);
        this._echoWPtr=0;
    }
    _sat(x,k){if(k<0.001)return x;return Math.tanh(x*k*100)*(1+k*0.5);}
    _hardclip(x,th){return x>th?th:x<-th?-th:x;}
    _satDuyanh(x,k){if(k<0.001)return x;const d=k*20;return Math.atan(x*d)/Math.atan(d);}
    _hardclipDuyanh(x,th){return x>th?th:x<-th?-th:x;}
    _limit(x,env){const a=Math.abs(x);if(a>1)env=Math.max(env,a);env*=0.9998;if(env<1)env=1;return{y:x/env,env};}
    _detectPitch(buf,sr){
        const n=buf.length>>1;let minTau=-1,minVal=Infinity;
        for(let tau=2;tau<n;tau++){let d=0;for(let i=0;i<n;i++){const df=buf[i]-buf[i+tau];d+=df*df;}if(d<minVal){minVal=d;minTau=tau;}if(tau>20&&d>minVal*3)break;}
        if(minTau<2||minVal>0.5)return -1;return sr/minTau;
    }
    _snapToScale(freq,si){
        if(freq<=0)return freq;
        const midi=12*Math.log2(freq/440)+69;
        const oct=Math.floor(midi/12),nO=midi-oct*12;
        const scale=SCALES[si%SCALES.length];let best=scale[0],bd=Infinity;
        for(const note of scale){
            const d=Math.abs(nO-note),d2=Math.abs(nO-note-12),d3=Math.abs(nO-note+12);
            const dd=Math.min(d,d2,d3);
            if(dd<bd){bd=dd;best=note;}
        }
        return 440*Math.pow(2,((oct*12+best)-69)/12);
    }
    process(inputs,outputs,params){
        const inp=inputs[0],out=outputs[0];
        if(!inp||!inp.length){for(let c=0;c<out.length;c++)for(let i=0;i<out[c].length;i++)out[c][i]=0;return true;}
        const preGain=params.preGain[0],drive=params.drive[0],crush=params.crush[0],
            width=params.width[0],postGain=params.postGain[0],
            gBass=Math.pow(10,params.eqBass[0]/20),
            gMid=Math.pow(10,params.eqMid[0]/20),
            gTreble=Math.pow(10,params.eqTreble[0]/20),
            voicePitch=params.voicePitch[0],voiceMix=params.voiceMix[0],
            atOn=params.autotuneOn[0]>0.5,atSpeed=params.autotuneSpeed[0],
            atScaleIdx=Math.round(params.autotuneScale[0]),
            gateOn=params.noiseGateOn[0]>0.5,gateThresh=params.noiseGateThreshold[0],
            godOn=params.godMode[0]>0.5,rvbMix=params.reverbMix[0],
            rvbDecay=params.reverbDecay[0],satMode=params.satMode[0]>0.5,
            echoMix=params.echoMix[0],
            echoTime=params.echoTime[0],
            echoFeedback=params.echoFeedback[0];
        const len=inp[0].length;
        for(let i=0;i<len;i++){
            let L=inp[0][i]*preGain,R=(inp[1]?inp[1][i]:inp[0][i])*preGain;
            if(gateOn){
                const lvl=(Math.abs(inp[0][i])+Math.abs(inp[1]?inp[1][i]:inp[0][i]))*0.5;
                const target=lvl>gateThresh?1:0;
                const coef=target>this._gateGain?0.35:0.025;
                this._gateGain+=(target-this._gateGain)*coef;
                L*=this._gateGain;R*=this._gateGain;
            }
            this._eqL.low+=0.08*(L-this._eqL.low);this._eqL.high+=0.12*(L-this._eqL.high);this._eqL.mid=L-this._eqL.low-this._eqL.high;
            L=this._eqL.low*gBass+this._eqL.mid*gMid+this._eqL.high*gTreble;
            this._eqR.low+=0.08*(R-this._eqR.low);this._eqR.high+=0.12*(R-this._eqR.high);this._eqR.mid=R-this._eqR.low-this._eqR.high;
            R=this._eqR.low*gBass+this._eqR.mid*gMid+this._eqR.high*gTreble;
            if(voiceMix>0.005){
                this._pitchBufferL[this._pWritePtr]=L;this._pitchBufferR[this._pWritePtr]=R;
                let iL0=Math.floor(this._pReadPtrL),iL1=(iL0+1)%this._pitchBufferSize;
                let fL=this._pReadPtrL-iL0;let sL=this._pitchBufferL[iL0]*(1-fL)+this._pitchBufferL[iL1]*fL;
                let iR0=Math.floor(this._pReadPtrR),iR1=(iR0+1)%this._pitchBufferSize;
                let fR=this._pReadPtrR-iR0;let sR=this._pitchBufferR[iR0]*(1-fR)+this._pitchBufferR[iR1]*fR;
                L=L*(1-voiceMix)+sL*voiceMix;R=R*(1-voiceMix)+sR*voiceMix;
                this._pWritePtr=(this._pWritePtr+1)%this._pitchBufferSize;
                this._pReadPtrL=(this._pReadPtrL+voicePitch)%this._pitchBufferSize;
                this._pReadPtrR=(this._pReadPtrR+voicePitch)%this._pitchBufferSize;
                let dL=(this._pWritePtr-Math.floor(this._pReadPtrL)+this._pitchBufferSize)%this._pitchBufferSize;
                if(dL<150||dL>this._pitchBufferSize-150)this._pReadPtrL=(this._pWritePtr-1024+this._pitchBufferSize)%this._pitchBufferSize;
                let dR=(this._pWritePtr-Math.floor(this._pReadPtrR)+this._pitchBufferSize)%this._pitchBufferSize;
                if(dR<150||dR>this._pitchBufferSize-150)this._pReadPtrR=(this._pWritePtr-1024+this._pitchBufferSize)%this._pitchBufferSize;
            }
            if(atOn){
                this._atBufL[this._atWritePtr%this._atBufSize]=L;
                this._atBufR[this._atWritePtr%this._atBufSize]=R;
                this._atWritePtr++;this._atDetectCounter++;
                if(this._atDetectCounter>=this._atDetectInterval){
                    this._atDetectCounter=0;
                    const analysis=new Float32Array(this._atBufSize);
                    const base=this._atWritePtr;
                    for(let j=0;j<this._atBufSize;j++)analysis[j]=this._atBufL[(base+j)%this._atBufSize];
                    const det=this._detectPitch(analysis,48000);
                    if(det>60&&det<1200){
                        const snap=this._snapToScale(det,atScaleIdx);
                        this._atTargetRatio=snap/det;
                    }
                }
                const lr=0.001+atSpeed*0.05;
                this._atCurrentRatio+=(this._atTargetRatio-this._atCurrentRatio)*lr;
                const ratio=Math.max(0.25,Math.min(4.0,this._atCurrentRatio));
                this._atShiftBufL[this._atShiftWritePtr]=L;this._atShiftBufR[this._atShiftWritePtr]=R;
                let aL0=Math.floor(this._atShiftReadPtrL),aL1=(aL0+1)%this._atShiftBufSize;
                let aFL=this._atShiftReadPtrL-aL0;let sL=this._atShiftBufL[aL0]*(1-aFL)+this._atShiftBufL[aL1]*aFL;
                let aR0=Math.floor(this._atShiftReadPtrR),aR1=(aR0+1)%this._atShiftBufSize;
                let aFR=this._atShiftReadPtrR-aR0;let sR=this._atShiftBufR[aR0]*(1-aFR)+this._atShiftBufR[aR1]*aFR;
                L=sL;R=sR;
                this._atShiftWritePtr=(this._atShiftWritePtr+1)%this._atShiftBufSize;
                this._atShiftReadPtrL=(this._atShiftReadPtrL+ratio)%this._atShiftBufSize;
                this._atShiftReadPtrR=(this._atShiftReadPtrR+ratio)%this._atShiftBufSize;
                let dL=(this._atShiftWritePtr-Math.floor(this._atShiftReadPtrL)+this._atShiftBufSize)%this._atShiftBufSize;
                if(dL<100||dL>this._atShiftBufSize-100)this._atShiftReadPtrL=(this._atShiftWritePtr-1024+this._atShiftBufSize)%this._atShiftBufSize;
                let dR=(this._atShiftWritePtr-Math.floor(this._atShiftReadPtrR)+this._atShiftBufSize)%this._atShiftBufSize;
                if(dR<100||dR>this._atShiftBufSize-100)this._atShiftReadPtrR=(this._atShiftWritePtr-1024+this._atShiftBufSize)%this._atShiftBufSize;
            }
            if(satMode){
                let fL=this._satDuyanh(L,drive),fR=this._satDuyanh(R,drive);
                if(crush>0){
                    const th=Math.max(0.001,1-crush*0.98);
                    fL=this._hardclipDuyanh(fL,th)/th;fR=this._hardclipDuyanh(fR,th)/th;
                    fL=this._satDuyanh(fL,drive*0.5+0.3);fR=this._satDuyanh(fR,drive*0.5+0.3);
                }
                if(width>0){const mid=(fL+fR)*0.5,side=(fL-fR)*0.5*(1+width*2);fL=mid+side;fR=mid-side;}
                fL*=postGain;fR*=postGain;L=fL;R=fR;
            }else{
                if(drive<0.7&&preGain<200){
                    this._lpL0=this._lpL0*.35+L*.65;this._lpL1=this._lpL1*.45+this._lpL0*.55;
                    this._lpR0=this._lpR0*.35+R*.65;this._lpR1=this._lpR1*.45+this._lpR0*.55;
                    let eL=this._lpL1,eR=this._lpR1;
                    const aL=Math.abs(eL);if(aL>0.02){this._subPhase+=0.12;eL+=Math.sin(this._subPhase)*aL*0.32;}
                    const aR=Math.abs(eR);if(aR>0.02)eR+=Math.sin(this._subPhase)*aR*0.32;
                    let rp=this._writePtr-1152;if(rp<0)rp+=3000;
                    const dL2=this._delayBufferL[rp],dR2=this._delayBufferR[rp];
                    this._delayBufferL[this._writePtr]=eL+dL2*0.18;
                    this._delayBufferR[this._writePtr]=eR+dR2*0.18;
                    this._writePtr=(this._writePtr+1)%3000;
                    L=Math.tanh((eL*.75+dL2*.25)*1.2);R=Math.tanh((eR*.75+dR2*.25)*1.2);
                }
                let M=(L+R)*.5;
                if(drive>0.7){this._sweepPhase+=0.04;this._signalPhase+=(2*Math.PI*(3900+Math.sin(this._sweepPhase)*600))/48000;M+=Math.sin(this._signalPhase)*.6*drive;}
                let fL=this._sat(drive>0.7?M:L,drive),fR=this._sat(drive>0.7?M:R,drive);
                if(crush>0){const th=Math.max(0.001,1-crush*.98);fL=this._hardclip(fL,th)/th;fR=this._hardclip(fR,th)/th;fL=this._sat(fL,drive*.5+.3);fR=this._sat(fR,drive*.5+.3);}
                const cw=(drive<0.5&&preGain===10)?0.65:width;
                if(cw>0){const mid=(fL+fR)*.5,side=(inp[0][i]-(inp[1]?inp[1][i]:inp[0][i]))*.5*(1+cw*2);fL=mid+side;fR=mid-side;}
                fL*=postGain;fR*=postGain;L=fL;R=fR;
            }
            if(rvbMix>0.001){
                const sum=(L+R)*0.5;let wet=0;
                const wptr=this._rvbWPtr,size=this._rvbSize;
                for(let j=0;j<4;j++){
                    const delay=this._rvbDelays[j];
                    const readIdx=(wptr-delay+size)%size;
                    const out=this._rvbBufs[j][readIdx];
                    this._rvbFilters[j]+=(out-this._rvbFilters[j])*0.25;
                    const filtered=this._rvbFilters[j];
                    const fb=rvbDecay*filtered;
                    this._rvbBufs[j][wptr]=sum+fb;
                    wet+=filtered;
                }
                wet*=0.25;
                this._rvbWPtr=(wptr+1)%size;
                L=L*(1-rvbMix)+wet*rvbMix;
                R=R*(1-rvbMix)+wet*rvbMix;
            }
            if(echoMix>0.001){
                const sr=48000;
                const delaySamples=Math.max(1,Math.floor(echoTime*sr));
                const size=this._echoBufL.length;
                const rIdx=(this._echoWPtr-delaySamples+size)%size;
                const dL=this._echoBufL[rIdx];
                const dR=this._echoBufR[rIdx];
                this._echoBufL[this._echoWPtr]=L+dL*echoFeedback;
                this._echoBufR[this._echoWPtr]=R+dR*echoFeedback;
                this._echoWPtr=(this._echoWPtr+1)%size;
                L=L*(1-echoMix)+dL*echoMix;
                R=R*(1-echoMix)+dR*echoMix;
            }
            if(godOn){
                const peak=Math.max(Math.abs(L),Math.abs(R));
                if(peak>this._godEnv)this._godEnv+=(peak-this._godEnv)*0.9;
                else this._godEnv+=(peak-this._godEnv)*0.02;
                const ge=Math.max(this._godEnv,1);
                L=(L/ge)*0.98;R=(R/ge)*0.98;
            }
            const rL=this._limit(L,this._limL);L=rL.y;this._limL=rL.env;
            const rR=this._limit(R,this._limR);R=rR.y;this._limR=rR.env;
            const bal=params.balance[0],pan=params.pan[0];
            const mL=params.muteLeft[0]>0.5,mR=params.muteRight[0]>0.5;
            const sL=params.soloLeft[0]>0.5,sR=params.soloRight[0]>0.5;
            if(sL&&!sR)R=0;else if(sR&&!sL)L=0;
            if(mL)L=0;if(mR)R=0;
            if(pan!==0){const gL=pan<=0?1:1-pan,gR=pan>=0?1:1+pan;L*=gL;R*=gR;}
            if(bal!==0.5){const gL=bal<=0.5?1:2*(1-bal),gR=bal>=0.5?1:2*bal;L*=gL;R*=gR;}
            out[0][i]=isFinite(L)?L:0;if(out[1])out[1][i]=isFinite(R)?R:0;
        }
        return true;
    }
}
registerProcessor('lucac-engine',LucacEngine);
`;

export const PRESETS: Record<string, any> = {
    'NORMAL':{preGain:1,drive:0,crush:0,width:0,postGain:1,eqBass:0,eqMid:0,eqTreble:0,satMode:0},
    'BIG':{preGain:10,drive:.02,crush:0,width:.65,postGain:1.4,eqBass:5,eqMid:-2,eqTreble:1,satMode:0},
    'LOUD':{preGain:50,drive:.55,crush:.35,width:0,postGain:3,eqBass:2,eqMid:4,eqTreble:-1,satMode:0},
    'NORMAL LOUD':{preGain:150,drive:.75,crush:.7,width:0,postGain:6,eqBass:6,eqMid:6,eqTreble:-3,satMode:0},
    'VERY LOUD':{preGain:1500,drive:1,crush:.95,width:0,postGain:40,eqBass:8,eqMid:0,eqTreble:5,satMode:0},
    'MAX':{preGain:5000,drive:1,crush:1,width:0,postGain:50000,eqBass:12,eqMid:12,eqTreble:12,satMode:0},
    'GODMODE':{preGain:2200,drive:0,crush:0,width:0,postGain:55,eqBass:1,eqMid:1,eqTreble:1,satMode:0},
    'CLEAN':{preGain:4,drive:0,crush:0,width:0,postGain:1,eqBass:0,eqMid:0,eqTreble:0,satMode:1},
    'WARM':{preGain:8,drive:0.3,crush:0,width:1,postGain:1.2,eqBass:0,eqMid:0,eqTreble:0,satMode:1},
    'WHISTLE':{preGain:25,drive:0.55,crush:0.35,width:0,postGain:2,eqBass:0,eqMid:0,eqTreble:0,satMode:1},
    'SUPER LOUD':{preGain:80,drive:0.75,crush:0.7,width:0,postGain:3,eqBass:0,eqMid:0,eqTreble:0,satMode:1},
    'APO':{preGain:200,drive:0.88,crush:0.88,width:0,postGain:4,eqBass:0,eqMid:0,eqTreble:0,satMode:1},
    'NUKE':{preGain:499,drive:0.99,crush:0.98,width:0,postGain:5,eqBass:0,eqMid:0,eqTreble:0,satMode:1}
};

export const VOICE_PRESETS: Record<string, any> = {
    'NORMAL':{pitch:1.0,formant:1.0,mix:0.0},
    'BABY':{pitch:1.65,formant:1.4,mix:0.95},
    'WOMAN':{pitch:1.35,formant:1.25,mix:0.90},
    'LOLI':{pitch:1.95,formant:1.55,mix:0.98},
    'DEEP':{pitch:0.65,formant:0.75,mix:0.95}
};

// Audio state — shared singleton
export const AudioState = {
    ctx: null as AudioContext | null,
    node: null as AudioWorkletNode | null,
    analyser: null as AnalyserNode | null,
    musicGain: null as GainNode | null,
    musicSource: null as AudioBufferSourceNode | null,
    activeStream: null as MediaStream | null,
    params: {
        preGain:1.0, drive:0.0, crush:0.0, width:0.0, postGain:1.0,
        inputDb:0.0, outputDb:0.0,
        eqBass:0.0, eqMid:0.0, eqTreble:0.0, musicVol:0.5,
        voicePitch:1.0, voiceFormant:1.0, voiceMix:0.0,
        autotuneOn:0, autotuneSpeed:0.3, autotuneScale:0,
        balance:0.5, pan:0, muteLeft:false, muteRight:false, soloLeft:false, soloRight:false,
        noiseGateOn:0, noiseGateThreshold:0.02,
        godMode:0, reverbMix:0.0, reverbDecay:0.5, satMode:0
    },
    echo: { mix: 0.0, time: 0.3, feedback: 0.35 }
};

export async function ensureContext(): Promise<AudioContext> {
    if (AudioState.ctx) return AudioState.ctx;
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    AudioState.ctx = new Ctx({ latencyHint: 'interactive', sampleRate: 48000 });
    const blob = new Blob([LUCAC_WORKLET], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    await AudioState.ctx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);
    AudioState.analyser = AudioState.ctx.createAnalyser();
    AudioState.analyser.fftSize = 64;
    AudioState.musicGain = AudioState.ctx.createGain();
    AudioState.musicGain.gain.value = AudioState.params.musicVol;
    return AudioState.ctx;
}

export async function buildProcessedStream(raw: MediaStream): Promise<MediaStream> {
    const ctx = await ensureContext();
    if (ctx.state === 'suspended') await ctx.resume();
    const src = ctx.createMediaStreamSource(raw);
    const dest = ctx.createMediaStreamDestination();
    const node = new AudioWorkletNode(ctx, 'lucac-engine', {
        numberOfOutputs: 1,
        outputChannelCount: [2]
    });
    AudioState.node = node;
    pushParams();
    src.connect(node);
    if (AudioState.musicGain) AudioState.musicGain.connect(node);
    node.connect(AudioState.analyser!);
    AudioState.analyser!.connect(dest);
    return dest.stream;
}

export function pushParams() {
    const node = AudioState.node;
    const ctx = AudioState.ctx;
    if (!node || !ctx) return;
    const P = AudioState.params;
    const t = ctx.currentTime;
    const inDb = Math.pow(10, (P.inputDb || 0) / 20);
    const outDb = Math.pow(10, (P.outputDb || 0) / 20);
    const mp = node.parameters;
    const set = (k: string, v: number) => mp.get(k)?.setTargetAtTime(v, t, 0.015);
    set('preGain', P.preGain * inDb);
    set('drive', P.drive); set('crush', P.crush); set('width', P.width);
    set('postGain', P.postGain * outDb);
    set('eqBass', P.eqBass); set('eqMid', P.eqMid); set('eqTreble', P.eqTreble);
    set('voicePitch', P.voicePitch); set('voiceFormant', P.voiceFormant); set('voiceMix', P.voiceMix);
    set('autotuneOn', P.autotuneOn); set('autotuneSpeed', P.autotuneSpeed); set('autotuneScale', P.autotuneScale);
    set('balance', P.balance); set('pan', P.pan);
    set('muteLeft', P.muteLeft ? 1 : 0); set('muteRight', P.muteRight ? 1 : 0);
    set('soloLeft', P.soloLeft ? 1 : 0); set('soloRight', P.soloRight ? 1 : 0);
    set('noiseGateOn', P.noiseGateOn ? 1 : 0); set('noiseGateThreshold', P.noiseGateThreshold);
    set('godMode', P.godMode ? 1 : 0);
    set('reverbMix', P.reverbMix); set('reverbDecay', P.reverbDecay);
    set('satMode', P.satMode);
    set('echoMix', AudioState.echo.mix);
    set('echoTime', AudioState.echo.time);
    set('echoFeedback', AudioState.echo.feedback);
}

export function playAudioFile(file: File) {
    const ctx = AudioState.ctx;
    if (!ctx) return;
    const r = new FileReader();
    r.onload = async (e) => {
        try {
            const buf = await ctx.decodeAudioData(e.target!.result as ArrayBuffer);
            if (AudioState.musicSource) { try { AudioState.musicSource.stop(); } catch {} }
            AudioState.musicSource = ctx.createBufferSource();
            AudioState.musicSource.buffer = buf;
            AudioState.musicSource.loop = true;
            AudioState.musicSource.connect(AudioState.musicGain!);
            AudioState.musicSource.start(0);
        } catch { console.error('[Lucac] Audio format error'); }
    };
    r.readAsArrayBuffer(file);
}

export function stopAudioFile() {
    if (AudioState.musicSource) {
        try { AudioState.musicSource.stop(); } catch {}
        AudioState.musicSource = null;
    }
}