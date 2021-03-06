/**
 * @class A wrapper around WebGL.
 * @name GL
 * @param {HTMLCanvasElement} element A canvas element.
 * @param {function} onload A callback function.
 * @param {function} onerror A callback function.
 * @param {function} onprogress A callback function.
 * @param {function} onloadstart A callback function.
 * @param {function} onunload A callback function.
 * @property {WebGLRenderingContext} ctx
 */
function GL(element, onload, onerror, onprogress, onloadstart, onunload) {
    var ctx,
        identifiers = ["webgl", "experimental-webgl"],
        i,
        l;
  
    for (var i = 0, l = identifiers.length; i < l; ++i) {
        try {
            ctx = element.getContext(identifiers[i], {antialias: true, alpha: false/*, preserveDrawingBuffer: true*/});
        } catch(e) {
            
        }

        if (ctx) {
            break;
        }
    }
  
    if (!ctx) {
        console.error("[WebGLContext]: Failed to create a WebGLContext");
        throw "[WebGLContext]: Failed to create a WebGLContext";
    }
  
    var hasVertexTexture = ctx.getParameter(ctx.MAX_VERTEX_TEXTURE_IMAGE_UNITS) > 0;
    var hasFloatTexture = ctx.getExtension("OES_texture_float");
    var compressedTextures = ctx.getExtension("WEBGL_compressed_texture_s3tc");
    
    if (!hasVertexTexture) {
        console.error("[WebGLContext]: No vertex shader texture support");
        throw "[WebGLContext]: No vertex shader texture support";
    }

    if (!hasFloatTexture) {
        console.error("[WebGLContext]: No float texture support");
        throw "[WebGLContext]: No float texture support";
    }
    
    if (!compressedTextures) {
        console.warn("[WebGLContext]: No compressed textures support");
        //onerror(self, "CompressedTextures");
    }
  
    var refreshViewProjectionMatrix = false;
    var projectionMatrix = mat4.create();
    var viewMatrix = mat4.create();
    var viewProjectionMatrix = mat4.create();
    var matrixStack = [];
    var textureStore = {};
    var textureLoading = {};
    var shaderUnitStore = {};
    var shaderStore = {};
    var boundShader;
    var boundShaderName = "";
    var boundTextures = [];
    var floatPrecision = "precision mediump float;\n";
    var textureHandlers = {};

    ctx.viewport(0, 0, element.clientWidth, element.clientHeight);
    ctx.depthFunc(ctx.LEQUAL);
    ctx.enable(ctx.DEPTH_TEST);
    ctx.enable(ctx.CULL_FACE);
  
    function textureOptions(wrapS, wrapT, magFilter, minFilter) {
        ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, wrapS);
        ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, wrapT);
        ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, magFilter);
        ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, minFilter);
    }