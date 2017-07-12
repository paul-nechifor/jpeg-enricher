import jpeg from 'jpeg-js';

$(document).ready(function() {
  if (!window.File || !window.FileList || !window.FileReader) {
    alert('No HTML5 Upload. Get a new browser.');
    return;
  }
  let page = new Page;
  return page.setup();
});

class Page {
  constructor() {
    this.qualityInput = document.getElementById('quality');
    this.repetitionsInput = document.getElementById('repetitions');
    this.shakinessInput = document.getElementById('shakiness');
    this.enrichBtn = $('#enrich');
    this.imageContainer = $('#original-image-container');
    this.originalImage = document.getElementById('original-image');
    this.orgWidth = this.originalImage.width;
    this.orgHeight = this.originalImage.height;
    this.fileInput = document.getElementById('file');
    this.quality = 20;
    this.repetitions = 100;
    this.shakiness = 1;
    this.originalImageSrc = null;
    this.buttonIsEnrich = true;
    this.continueReps = false;
  }

  setup() {
    let opts = {placement: 'top', trigger: 'focus'};
    $('#quality').popover(opts).val(this.quality);
    $('#repetitions').popover(opts).val(this.repetitions);
    $('#shakiness').popover(opts).val(this.shakiness);

    this.fileInput.onchange = this.processFilesChange.bind(this);
    this.enrichBtn.click(() => this.enrichClicked());
    this.resetContainerSize();
  }

  resetContainerSize() {
    this.imageContainer.css({width: this.orgWidth + 'px', height: this.orgHeight + 'px'});
  }

  processFilesChange() {
    let { files } = this.fileInput;
    if (files.length === 0) { return; }
    let file = files[0];
    if (!file.type.match('image.*')) { return; }
    let reader = new FileReader;
    reader.onload = e => {
      this.originalImageSrc = e.target.result;
      this.originalImage.src = this.originalImageSrc;
      this.orgWidth = this.originalImage.width;
      this.orgHeight = this.originalImage.height;
      return this.resetContainerSize();
    };
    reader.readAsDataURL(file);
  }

  setButtonType(buttonIsEnrich) {
    if (this.buttonIsEnrich === buttonIsEnrich) { return; }
    this.buttonIsEnrich = buttonIsEnrich;
    if (this.buttonIsEnrich) {
      this.enrichBtn.removeClass('btn-danger');
      this.enrichBtn.addClass('btn-info');
      this.enrichBtn.find('.glyphicon').attr('class', 'glyphicon glyphicon-ok');
      this.enrichBtn.find('.text').text(' Enrich');
    } else {
      this.enrichBtn.removeClass('btn-info');
      this.enrichBtn.addClass('btn-danger');
      this.enrichBtn.find('.glyphicon').attr('class', 'glyphicon glyphicon-remove');
      this.enrichBtn.find('.text').text(' Stop');
    }
  }

  enrichClicked() {
    if (this.buttonIsEnrich) {
      this.continueReps = true;
      this.readNumbers();
      this.setButtonType(false);
      this.enrichImage(iteration => {
        let progress = iteration + ' / ' + this.repetitions;
        this.repetitionsInput.value = progress;
        return this.continueReps;
      }
      , (lastX, lastY) => {
        this.repetitionsInput.value = this.repetitions;
        return this.setButtonType(true);
      });
    } else {
      this.continueReps = false;
    }
  }

  readNumbers() {
    let quality = Math.floor(Number(this.qualityInput.value));
    let repetitions = Math.floor(Number(this.repetitionsInput.value));
    let shakiness = Math.floor(Number(this.shakinessInput.value));
    if ((quality >= 1) && (quality <= 100)) { this.quality = quality; }
    if (repetitions >= 1) { this.repetitions = repetitions; }
    if (shakiness >= 0) { this.shakiness = shakiness; }
    this.qualityInput.value = this.quality;
    this.repetitionsInput.value = this.repetitions;
    this.shakinessInput.value = this.shakiness;
  }

  enrichImage(continueCallback, onFinish) {
    let canvas = document.createElement('canvas');
    canvas.width = this.originalImage.width + this.shakiness;
    canvas.height = this.originalImage.height + this.shakiness;
    let ctx = canvas.getContext('2d');
    let i = 0;
    let lastX = 0;
    let lastY = 0;
    var nextStep = () => {
      let x = Math.floor(Math.random() * (this.shakiness + 1));
      let y = Math.floor(Math.random() * (this.shakiness + 1));
      ctx.drawImage(this.originalImage,
          lastX, lastY,
          this.originalImage.width - lastX, this.originalImage.height - lastY,
          x, y,
          this.originalImage.width - lastX, this.originalImage.height - lastY);
      lastX = x;
      lastY = y;
      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      let newData = jpeg.encode(imageData, this.quality);
      let b64 = base64EncArr(newData.data);
      this.originalImage.src = `data:image/jpeg;base64,${b64}`;

      let iData = ctx.createImageData(newData.width, newData.height);
      iData.data.set(newData.data);
      ctx.putImageData(iData, 0, 0);

      this.originalImage.style.marginLeft = (-x) + 'px';
      this.originalImage.style.marginTop = (-y) + 'px';
      let goOn = continueCallback(i);
      i++;
      if (goOn && (i < this.repetitions)) {
        setTimeout(nextStep, 0);
      } else {
        onFinish(lastX, lastY);
      }
    };
    nextStep();
  }
}

// From: https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding
function uint6ToB64(nUint6) {
  if (nUint6 < 26) {
    return nUint6 + 65;
  } else if (nUint6 < 52) {
    return nUint6 + 71;
  } else if (nUint6 < 62) {
    return nUint6 - 4;
  } else if (nUint6 === 62) {
    return 43;
  } else if (nUint6 === 63) {
    return 47;
  } else {
    return 65;
  }
}

function base64EncArr(aBytes) {
  let nMod3 = 2;
  let sB64Enc = "";
  let nLen = aBytes.length;
  let nUint24 = 0;
  let nIdx = 0;

  while (nIdx < nLen) {
    nMod3 = nIdx % 3;
    if ((nIdx > 0) && ((((nIdx * 4) / 3) % 76) === 0)) { sB64Enc += "\r\n"; }
    nUint24 |= aBytes[nIdx] << ((16 >>> nMod3) & 24);
    if ((nMod3 === 2) || ((aBytes.length - nIdx) === 1)) {
      sB64Enc += String.fromCharCode(uint6ToB64((nUint24 >>> 18) & 63), uint6ToB64((nUint24 >>> 12) & 63), uint6ToB64((nUint24 >>> 6) & 63), uint6ToB64(nUint24 & 63));
      nUint24 = 0;
    }
    nIdx++;
  }
  return sB64Enc.substr(0, (sB64Enc.length - 2) + nMod3) + ((nMod3 === 2 ? "" : (nMod3 === 1 ? "=" : "==")));
}
