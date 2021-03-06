var Parser = (function () {
    function readExtent(reader) {
        return {boundsRadius: readFloat32(reader), minimum: readVector3(reader), maximum: readVector3(reader)};
    }

    var tagToTrack = {
        LAYS: {
            KMTF: [readUint32, "textureId", 0],
            KMTA: [readFloat32, "alpha", 1]
        },

        TXAN: {
            KTAT: [readVector3, "translation", [0, 0, 0]],
            KTAR: [readVector4, "rotation", [0, 0, 0, 1]],
            KTAS: [readVector3, "scaling", [1, 1, 1]]
        },

        GEOA: {
            KGAO: [readFloat32, "alpha", 1],
            KGAC: [readVector3, "color", [0, 0, 0]]
        },

        LITE: {
            KLAS: [readFloat32, "attenuationStart", 0],
            KLAE: [readFloat32, "attenuationEnd", 0],
            KLAC: [readVector3, "color", [0, 0, 0]],
            KLAI: [readFloat32, "intensity", 0],
            KLBI: [readFloat32, "ambientIntensity", 0],
            KLBC: [readVector3, "ambientColor", [0, 0, 0]],
            KLAV: [readFloat32, "visibility", 1]
        },

        ATCH: {
            KATV: [readFloat32, "visibility", 1]
        },

        PREM: {
            KPEE: [readFloat32, "emissionRate", 0],
            KPEG: [readFloat32, "gravity", 0],
            KPLN: [readFloat32, "longitude", 0],
            KPLT: [readFloat32, "latitude", 0],
            KPEL: [readFloat32, "lifespan", 0],
            KPES: [readFloat32, "speed", 0],
            KPEV: [readFloat32, "visibility", 1]
        },

        PRE2: {
            KP2S: [readFloat32, "speed", 0],
            KP2R: [readFloat32, "variation", 0],
            KP2L: [readFloat32, "latitude", 0],
            KP2G: [readFloat32, "gravity", 0],
            KP2E: [readFloat32, "emissionRate", 0],
            KP2N: [readFloat32, "length", 0],
            KP2W: [readFloat32, "width", 0],
            KP2V: [readFloat32, "visibility", 1]
        },

        RIBB: {
            KRHA: [readFloat32, "heightAbove", 0],
            KRHB: [readFloat32, "heightBelow", 0],
            KRAL: [readFloat32, "alpha", 1],
            KRCO: [readVector3, "color", [0, 0, 0]],
            KRTX: [readUint32, "textureSlot", 0],
            KRVS: [readFloat32, "visibility", 1]
        },

        CAMS: {
            KCTR: [readVector3, "positionTranslation", [0, 0, 0]],
            KTTR: [readVector3, "targetTranslation", [0, 0, 0]],
            KCRL: [readUint32, "rotation", 0]
        },

        NODE: {
            KGTR: [readVector3, "translation", [0, 0, 0]],
            KGRT: [readVector4, "rotation", [0, 0, 0, 1]],
            KGSC: [readVector3, "scaling", [1, 1, 1]]
        }
    };

    function parseChunk(reader, size, Func, nodes) {
        var totalInclusiveSize = 0,
            elements = [],
            element;
        
        while (totalInclusiveSize !== size) {
            element = new Func(reader, nodes);

            totalInclusiveSize += element.inclusiveSize;

            elements[elements.length] = element;
        }

        return elements;
    }

    function parseCountChunk(reader, count, Func) {
        var elements = [];

        for (var i = 0; i < count; i++) {
            elements[i] = new Func(reader);
        }

        return elements;
    }

    function parseCountChunkByVal(reader, count, Func) {
        var elements = [];

        for (var i = 0; i < count; i++) {
            elements[i] = Func(reader);
        }

        return elements;
    }

    function parseTracks(reader, type) {
        var tracks = {},
            tagTrack = tagToTrack[type];

        while (tagTrack[peek(reader, 4)]) {
            var trackType = tagTrack[read(reader, 4)];

            tracks[trackType[1]] = new TrackChunk(reader, trackType);
        }

        return tracks;
    }

    function readNode(reader, nodes) {
        var node = new Node(reader),
            length = nodes.length;

        nodes[length] = node;

        return length;
    }

    function Track(reader, interpolationType, type) {
        this.frame = readInt32(reader);
        this.vector = type(reader);

        if (interpolationType > 1) {
            this.inTan = type(reader);
            this.outTan = type(reader);
        }
    }

    function TrackChunk(reader, trackType) {
        var count = readUint32(reader);

        this.interpolationType = readUint32(reader);
        this.globalSequenceId = readInt32(reader);
        this.tracks = [];

        for (var i = 0; i < count; i++) {
            this.tracks[i] = new Track(reader, this.interpolationType, trackType[0]);
        }
        
        this.type = trackType[1];
        this.defval = trackType[2];
    }

    function Node(reader) {
        this.inclusiveSize = readUint32(reader);
        this.name = read(reader, 80);
        this.objectId = readUint32(reader);
        this.parentId = readInt32(reader);

        var flags = readUint32(reader);

        this.flags = flags;
        this.dontInheritTranslation = flags & 1;
        this.dontInheritRotation = flags & 2;
        this.dontInheritScaling = flags & 4;
        this.billboarded = flags & 8;
        this.billboardedX = flags & 16;
        this.billboardedY = flags & 32;
        this.billboardedZ = flags & 64;
        this.cameraAnchored = flags & 128;
        this.bone = flags & 256;
        this.light = flags & 512;
        this.eventObject = flags & 1024;
        this.attachment = flags & 2048;
        this.particleEmitter = flags & 4096;
        this.collisionShape = flags & 8192;
        this.ribbonEmitter = flags & 16384;
        this.emitterUsesMdlOrUnshaded = flags & 32768;
        this.emitterUsesTgaOrSortPrimitivesFarZ = flags & 65536;
        this.lineEmitter = flags & 131072;
        this.unfogged = flags & 262144;
        this.modelSpace = flags & 524288;
        this.xYQuad = flags & 1048576;
        this.tracks = parseTracks(reader, "NODE");
    }

    function VersionChunk(reader) {
    this.version = readUint32(reader);
    }

    function ModelChunk(reader) {
        this.name = read(reader, 80);
        this.animationPath = read(reader, 260);
        this.extent = readExtent(reader);
        this.blendTime = readUint32(reader);
    }

    function Sequence(reader) {
        this.name = read(reader, 80);
        this.interval = readUint32Array(reader, 2);
        this.moveSpeed = readFloat32(reader);
        this.flags = readUint32(reader);
        this.rarity = readFloat32(reader);
        this.syncPoint = readUint32(reader);
        this.extent = readExtent(reader);
    }

    function SequenceChunk(reader, size) {
        this.objects = parseCountChunk(reader, size / 132, Sequence);
    }

    function GlobalSequenceChunk(reader, size) {
        this.objects = readUint32Array(reader, size / 4);
    }

    function Texture(reader) {
        this.replaceableId = readUint32(reader);
        this.path = read(reader, 260);
        this.flags = readUint32(reader);
    }

    function TextureChunk(reader, size) {
        this.objects = parseCountChunk(reader, size / 268, Texture);
    }
    /*
    function SoundTrack(reader) {
    this.path = read(reader, 260);
    this.volume = readFloat32(reader);
    this.pitch = readFloat32(reader);
    this.flags = readUint32(reader);
    }

    function SoundTrackChunk(reader, size) {
    this.soundTracks = parseCountChunk(reader, size / 272, SoundTrack);
    }
    */
    function Layer(reader) {
        this.inclusiveSize = readUint32(reader);
        this.filterMode = readUint32(reader);

        var flags = readUint32(reader);

        this.shadingFlags = flags;
        this.unshaded = flags & 1;
        this.sphereEnvironmentMap = flags & 2;
        this.twoSided = flags & 16;
        this.unfogged = flags & 32;
        this.noDepthTest = flags & 64;
        this.noDepthSet = flags & 128;
        
        this.textureId = readUint32(reader);
        this.textureAnimationId = readInt32(reader);
        this.coordId = readUint32(reader);
        this.alpha = readFloat32(reader);
        this.tracks = parseTracks(reader, "LAYS");
    }

    function Material(reader) {
        this.inclusiveSize = readUint32(reader);
        this.priorityPlane = readUint32(reader);
        this.flags = readUint32(reader);
        
        skip(reader, 4); // LAYS
        this.layers = parseCountChunk(reader, readUint32(reader), Layer);
    }

    function MaterialChunk(reader, size) {
        this.objects = parseChunk(reader, size, Material);
    }

    function TextureAnimation(reader) {
        this.inclusiveSize = readUint32(reader);
        this.tracks = parseTracks(reader, "TXAN");
    }

    function TextureAnimationChunk(reader, size) {
        this.objects = parseChunk(reader, size, TextureAnimation);
    }

    function Geoset(reader) {
        this.inclusiveSize = readUint32(reader);

        skip(reader, 4); // VRTX
        this.vertexPositions = readFloat32Array(reader, readUint32(reader) * 3);

        skip(reader, 4); // NRMS
        this.vertexNormals = readFloat32Array(reader, readUint32(reader) * 3);

        skip(reader, 4); // PTYP
        this.faceTypeGroups = readUint32Array(reader, readUint32(reader));

        skip(reader, 4); // PCNT
        this.faceGroups = readUint32Array(reader, readUint32(reader));

        skip(reader, 4); // PVTX
        this.faces = readUint16Array(reader, readUint32(reader));

        skip(reader, 4); // GNDX
        this.vertexGroups = readUint8Array(reader, readUint32(reader));

        skip(reader, 4); // MTGC
        this.matrixGroups = readUint32Array(reader, readUint32(reader));

        skip(reader, 4); // MATS
        this.matrixIndexes = readUint32Array(reader, readUint32(reader));

        this.materialId = readUint32(reader);
        this.selectionGroup = readUint32(reader);
        this.selectionFlags = readUint32(reader);
        this.extent =  readExtent(reader);
        this.extents = parseCountChunkByVal(reader, readUint32(reader), readExtent);

        skip(reader, 4); // UVAS

        this.textureCoordinateSets = [];

        for (var i = 0, l = readUint32(reader); i < l; i++) {
            skip(reader, 4); // UVBS
            this.textureCoordinateSets[i] = readFloat32Array(reader, readUint32(reader) * 2);
        }
    }

    function GeosetChunk(reader, size) {
        this.objects = parseChunk(reader, size, Geoset);
    }

    function GeosetAnimation(reader) {
        this.inclusiveSize = readUint32(reader);
        this.alpha = readFloat32(reader);
        this.flags = readUint32(reader);
        this.color = readVector3(reader);
        this.geosetId = readUint32(reader);
        this.tracks = parseTracks(reader, "GEOA");
    }

    function GeosetAnimationChunk(reader, size) {
        this.objects = parseChunk(reader, size, GeosetAnimation);
    }

    function Bone(reader, nodes) {
        this.node = readNode(reader, nodes);
        this.geosetId = readUint32(reader);
        this.geosetAnimationId = readUint32(reader);
        this.inclusiveSize = nodes[this.node].inclusiveSize + 8;
    }

    function BoneChunk(reader, size, nodes) {
        this.objects = parseChunk(reader, size, Bone, nodes);
    }

    function Light(reader, nodes) {
        this.inclusiveSize = readUint32(reader);
        this.node = readNode(reader, nodes);
        this.type = readUint32(reader);
        this.attenuationStart = readUint32(reader);
        this.attenuationEnd = readUint32(reader);
        this.color = readVector3(reader);
        this.intensity = readFloat32(reader);
        this.ambientColor = readVector3(reader);
        this.ambientIntensity = readFloat32(reader);
        this.tracks = parseTracks(reader, "LITE");
    }

    function LightChunk(reader, size, nodes) {
        this.objects = parseChunk(reader, size, Light, nodes);
    }

    function Helper(reader, nodes) {
        this.node = readNode(reader, nodes);
        this.inclusiveSize = nodes[this.node].inclusiveSize;
    }

    function HelperChunk(reader, size, nodes) {
        this.objects = parseChunk(reader, size, Helper, nodes);
    }

    function Attachment(reader, nodes) {
        this.inclusiveSize = readUint32(reader);
        this.node = readNode(reader, nodes);
        this.path = read(reader, 260);
        this.attachmentId = readUint32(reader);
        this.tracks = parseTracks(reader, "ATCH");
    }

    function AttachmentChunk(reader, size, nodes) {
        this.objects = parseChunk(reader, size, Attachment, nodes);
    }

    function PivotPointChunk(reader, size) {
        this.objects = readFloat32Matrix(reader, size / 12, 3);
    }

    function ParticleEmitter(reader, nodes) {
        this.inclusiveSize = readUint32(reader);
        this.node = readNode(reader, nodes);
        this.emissionRate = readFloat32(reader);
        this.gravity = readFloat32(reader);
        this.longitude = readFloat32(reader);
        this.latitude = readFloat32(reader);
        this.spawnModelPath = read(reader, 260);
        this.lifespan = readFloat32(reader);
        this.initialVelocity = readFloat32(reader);
        this.tracks = parseTracks(reader, "PREM");
    }

    function ParticleEmitterChunk(reader, size, nodes) {
        this.objects = parseChunk(reader, size, ParticleEmitter, nodes);
    }

    function ParticleEmitter2(reader, nodes) {
        this.inclusiveSize = readUint32(reader);
        this.node = readNode(reader, nodes);
        this.speed = readFloat32(reader);
        this.variation = readFloat32(reader);
        this.latitude = readFloat32(reader);
        this.gravity = readFloat32(reader);
        this.lifespan = readFloat32(reader);
        this.emissionRate = readFloat32(reader);
        this.width = readFloat32(reader);
        this.length = readFloat32(reader);
        this.filterMode = readUint32(reader);
        this.rows = readUint32(reader);
        this.columns = readUint32(reader);
        this.headOrTail = readUint32(reader);
        this.tailLength = readFloat32(reader);
        this.timeMiddle = readFloat32(reader);
        this.segmentColor = readFloat32Matrix(reader, 3, 3);
        this.segmentAlpha = readUint8Array(reader, 3);
        this.segmentScaling = readFloat32Array(reader, 3);
        this.headInterval = readUint32Array(reader, 3);
        this.headDecayInterval = readUint32Array(reader, 3);
        this.tailInterval = readUint32Array(reader, 3);
        this.tailDecayInterval = readUint32Array(reader, 3);
        this.textureId = readUint32(reader);
        this.squirt = readUint32(reader);
        this.priorityPlane = readUint32(reader);
        this.replaceableId = readUint32(reader);
        this.tracks = parseTracks(reader, "PRE2");
    }

    function ParticleEmitter2Chunk(reader, size, nodes) {
        this.objects = parseChunk(reader, size, ParticleEmitter2, nodes);
    }

    function RibbonEmitter(reader, nodes) {
        this.inclusiveSize = readUint32(reader);
        this.node = readNode(reader, nodes);
        this.heightAbove = readFloat32(reader);
        this.heightBelow = readFloat32(reader);
        this.alpha = readFloat32(reader);
        this.color = readVector3(reader);
        this.lifespan = readFloat32(reader);
        this.textureSlot = readUint32(reader);
        this.emissionRate = readUint32(reader);
        this.rows = readUint32(reader);
        this.columns = readUint32(reader);
        this.materialId = readUint32(reader);
        this.gravity = readFloat32(reader);
        this.tracks = parseTracks(reader, "RIBB");
    }

    function RibbonEmitterChunk(reader, size, nodes) {
        this.objects = parseChunk(reader, size, RibbonEmitter, nodes);
    }

    function EventObjectTracks(reader) {
        

        var count = readUint32(reader);

        this.globalSequenceId = readInt32(reader);
        this.tracks = readUint32Array(reader, count);
    }

    function EventObject(reader, nodes) {
        this.node = readNode(reader, nodes);
        
        skip(reader, 4); // KEVT
        
        var count = readUint32(reader);

        this.globalSequenceId = readInt32(reader);
        this.tracks = readUint32Array(reader, count);
        this.inclusiveSize = nodes[this.node].inclusiveSize + 12 + this.tracks.length * 4;
    }

    function EventObjectChunk(reader, size, nodes) {
        this.objects = parseChunk(reader, size, EventObject, nodes);
    }

    function Camera(reader) {
        this.inclusiveSize = readUint32(reader);
        this.name = read(reader, 80);
        this.position = readVector3(reader);
        this.fieldOfView = readFloat32(reader);
        this.farClippingPlane = readFloat32(reader);
        this.nearClippingPlane = readFloat32(reader);
        this.targetPosition = readVector3(reader);
        this.tracks = parseTracks(reader, "CAMS");
    }
    
    function CameraChunk(reader, size) {
        this.objects = parseChunk(reader, size, Camera);
    }
    
    function CollisionShape(reader, nodes) {
        this.node = readNode(reader, nodes);
        
        var type = readUint32(reader);
        
        this.type = type;
        this.inclusiveSize = nodes[this.node].inclusiveSize + 4;
        
        if (type === 0 || type === 1 || type === 3) {
            this.vertices = readFloat32Matrix(reader, 2, 3);
            this.inclusiveSize += 24;
        } else if (type === 2) {
            this.vertices = [readVector3(reader)];
            this.inclusiveSize += 12;
        }

        if (type === 2 || type === 3) {
            this.radius = readFloat32(reader);
            this.inclusiveSize += 4;
        }
    }
    
    function CollisionShapeChunk(reader, size, nodes) {
        this.objects = parseChunk(reader, size, CollisionShape, nodes);
    }
    
    var tagToChunk = {
        "VERS": [VersionChunk, "versionChunk"],
        "MODL": [ModelChunk, "modelChunk"],
        "SEQS": [SequenceChunk, "sequenceChunk"],
        "GLBS": [GlobalSequenceChunk, "globalSequenceChunk"],
        "TEXS": [TextureChunk, "textureChunk"],
        //"SNDS": [SoundTrackChunk, "soundTrackChunk"],
        "MTLS": [MaterialChunk, "materialChunk"],
        "TXAN": [TextureAnimationChunk, "textureAnimationChunk"],
        "GEOS": [GeosetChunk, "geosetChunk"],
        "GEOA": [GeosetAnimationChunk, "geosetAnimationChunk"],
        "BONE": [BoneChunk, "boneChunk"],
        "LITE": [LightChunk, "lightChunk"],
        "HELP": [HelperChunk, "helperChunk"],
        "ATCH": [AttachmentChunk, "attachmentChunk"],
        "PIVT": [PivotPointChunk, "pivotPointChunk"],
        "PREM": [ParticleEmitterChunk, "particleEmitterChunk"],
        "PRE2": [ParticleEmitter2Chunk, "particleEmitter2Chunk"],
        "RIBB": [RibbonEmitterChunk, "ribbonEmitterChunk"],
        "EVTS": [EventObjectChunk, "eventObjectChunk"],
        "CAMS": [CameraChunk, "cameraChunk"],
        "CLID": [CollisionShapeChunk, "collisionShapeChunk"]
    };

    function Parser(reader) {
        var tag,
            size,
            chunk;

        this.nodes = [];

        while (remaining(reader) > 0) {
            tag = read(reader, 4);
            size = readUint32(reader);
            chunk = tagToChunk[tag];

            if (chunk) {
                this[chunk[1]] = new chunk[0](reader, size, this.nodes);
            } else {
                //console.log("Didn't parse chunk " + tag);
                skip(reader, size);
            }
        }
    }

    return (function (reader) {
        if (read(reader, 4) === "MDLX") {
            return new Parser(reader);
        }
    });
}());