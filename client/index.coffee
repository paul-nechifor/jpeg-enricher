jpeg = require 'jpeg-js'

$(document).ready ->
  if not window.File or not window.FileList or not window.FileReader
    alert 'No HTML5 Upload. Get a new browser.'
    return
  page = new Page
  page.setup()

class Page
  constructor: ->
    @qualityInput = document.getElementById 'quality'
    @repetitionsInput = document.getElementById 'repetitions'
    @shakinessInput = document.getElementById 'shakiness'
    @enrichBtn = $ '#enrich'
    @originalImage = document.getElementById 'original-image'
    @imageContainer = document.getElementById 'original-image-container'
    @fileInput = document.getElementById 'file'
    @quality = 20
    @repetitions = 100
    @shakiness = 1
    @originalImageSrc = null
    @buttonIsEnrich = true
    @continueReps = false

  setup: ->
    opts = {placement: 'top', trigger: 'focus'}
    $('#quality').popover(opts).val @quality
    $('#repetitions').popover(opts).val @repetitions
    $('#shakiness').popover(opts).val @shakiness

    @fileInput.onchange = @processFilesChange.bind @
    @enrichBtn.click => @enrichClicked()
    @originalImage.onload = => @resetContainerSize()
    @resetContainerSize()

  resetContainerSize: ->
    @imageContainer.style.width = @originalImage.width + 'px'
    @imageContainer.style.height = @originalImage.height + 'px'

  processFilesChange: ->
    files = @fileInput.files
    return if files.length is 0
    file = files[0]
    return unless file.type.match 'image.*'
    reader = new FileReader
    reader.onload = (e) =>
      @originalImageSrc = e.target.result
      @originalImage.src = @originalImageSrc
      @resetContainerSize()
    reader.readAsDataURL file

  setButtonType: (buttonIsEnrich) ->
    return if @buttonIsEnrich is buttonIsEnrich
    @buttonIsEnrich = buttonIsEnrich
    if @buttonIsEnrich
      @enrichBtn.removeClass 'btn-danger'
      @enrichBtn.addClass 'btn-info'
      @enrichBtn.find('.glyphicon').attr 'class', 'glyphicon glyphicon-ok'
      @enrichBtn.find('.text').text ' Enrich'
    else
      @enrichBtn.removeClass 'btn-info'
      @enrichBtn.addClass 'btn-danger'
      @enrichBtn.find('.glyphicon').attr 'class', 'glyphicon glyphicon-remove'
      @enrichBtn.find('.text').text ' Stop'
    return

  enrichClicked: ->
    if @buttonIsEnrich
      @continueReps = true
      @readNumbers()
      @setButtonType false
      @enrichImage (iteration) =>
        progress = iteration + ' / ' + @repetitions
        @repetitionsInput.value = progress
        @continueReps
      , (lastX, lastY) =>
        @repetitionsInput.value = @repetitions
        @setButtonType true
    else
      @continueReps = false
    return

  readNumbers: ->
    quality = Math.floor Number @qualityInput.value
    repetitions = Math.floor Number @repetitionsInput.value
    shakiness = Math.floor Number @shakinessInput.value
    @quality = quality if quality >= 1 and quality <= 100
    @repetitions = repetitions if repetitions >= 1
    @shakiness = shakiness if shakiness >= 0
    @qualityInput.value = @quality
    @repetitionsInput.value = @repetitions
    @shakinessInput.value = @shakiness

  enrichImage: (continueCallback, onFinish) ->
    canvas = document.createElement 'canvas'
    canvas.width = @originalImage.width + @shakiness
    canvas.height = @originalImage.height + @shakiness
    ctx = canvas.getContext '2d'
    i = 0
    lastX = 0
    lastY = 0
    nextStep = =>
      x = Math.floor Math.random() * (@shakiness + 1)
      y = Math.floor Math.random() * (@shakiness + 1)
      ctx.drawImage @originalImage,
          lastX, lastY,
          @originalImage.width - lastX, @originalImage.height - lastY,
          x, y,
          @originalImage.width - lastX, @originalImage.height - lastY
      lastX = x
      lastY = y
      imageData = ctx.getImageData 0, 0, canvas.width, canvas.height

      newData = jpeg.encode imageData, @quality
      b64 = base64EncArr newData.data
      @originalImage.src = 'data:image/jpeg;base64,' + b64

      iData = ctx.createImageData newData.width, newData.height
      iData.data.set newData.data
      ctx.putImageData iData, 0, 0

      @originalImage.style.marginLeft = (-x) + 'px'
      @originalImage.style.marginTop = (-y) + 'px'
      goOn = continueCallback i
      i++
      if goOn and i < @repetitions
        setTimeout nextStep, 0
      else
        onFinish lastX, lastY
      return
    nextStep()

# From: https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding
uint6ToB64 = (nUint6) ->
  (if nUint6 < 26 then nUint6 + 65 else (if nUint6 < 52 then nUint6 + 71 else (if nUint6 < 62 then nUint6 - 4 else (if nUint6 is 62 then 43 else (if nUint6 is 63 then 47 else 65)))))
base64EncArr = (aBytes) ->
  nMod3 = 2
  sB64Enc = ""
  nLen = aBytes.length
  nUint24 = 0
  nIdx = 0

  while nIdx < nLen
    nMod3 = nIdx % 3
    sB64Enc += "\r\n"  if nIdx > 0 and (nIdx * 4 / 3) % 76 is 0
    nUint24 |= aBytes[nIdx] << (16 >>> nMod3 & 24)
    if nMod3 is 2 or aBytes.length - nIdx is 1
      sB64Enc += String.fromCharCode(uint6ToB64(nUint24 >>> 18 & 63), uint6ToB64(nUint24 >>> 12 & 63), uint6ToB64(nUint24 >>> 6 & 63), uint6ToB64(nUint24 & 63))
      nUint24 = 0
    nIdx++
  sB64Enc.substr(0, sB64Enc.length - 2 + nMod3) + ((if nMod3 is 2 then "" else (if nMod3 is 1 then "=" else "==")))
