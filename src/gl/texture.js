function Texture(source, options, textureHandlers, ctx, compressedTextures, onloadstart, onrrror, onprogress, onload) {
    var fileType = fileTypeFromPath(source),
        handler = textureHandlers[fileType];
    
    this.type = "texture";
    this.source = source;
    this.options = options || {};
    this.handler = handler;
    this.onerror = onerror;
    this.onprogress = onprogress;
    this.onload = onload;
        
    onloadstart(this);
    
    if (handler) {
        this.request = getRequest(source, true, this.onloadTexture.bind(this, ctx, compressedTextures), onerror.bind(undefined, this), onprogress.bind(undefined, this));
    } else {
        onerror(this, "NoHandler");
    }
}

Texture.prototype = {
    onloadTexture: function (ctx, compressedTextures, e) {
        var target = e.target,
            response = target.response,
            status = target.status;
        
        if (status === 200) {
            this.impl = new this.handler(target.response, this.options, ctx, this.onerror.bind(undefined, this),  this.onload.bind(undefined, this), compressedTextures);
        } else {
            this.onerror(this, "" + status);
        }
    },
    
    loaded: function () {
        if (this.request) {
            return (this.request.readyState === XMLHttpRequest.DONE);
        }
        
        return false;
    }
};