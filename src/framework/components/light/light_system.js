pc.extend(pc.fw, function () {
/**
     * @name pc.fw.LightComponentSystem
     * @constructor Create a new LightComponentSystem.
     * @class A Light Component is used to dynamically light the scene.
     * @param {pc.fw.ApplicationContext} context The application context.
     * @extends pc.fw.ComponentSystem
     */
    var LightComponentSystem = function (context) {
        this.id = 'light';
        this.description = "Enables the Entity to emit light."
        context.systems.add(this.id, this);

        this.ComponentType = pc.fw.LightComponent;
        this.DataType = pc.fw.LightComponentData;

        this.schema = [{
            name: "enabled",
            displayName: "Enabled",
            description: "Enable or disable the light",
            type: "boolean",
            defaultValue: true
        }, {
            name: "type",
            displayName: "Type",
            description: "The type of the light",
            type: "enumeration",
            options: {
                enumerations: [{
                    name: 'Directional',
                    value: 'directional'
                }, {
                    name: 'Point',
                    value: 'point'
                }, {
                    name: 'Spot',
                    value: 'spot'
                }]
            },
            defaultValue: "directional"
        }, {
            name: "color",
            displayName: "Color",
            description: "Light Color",
            type: "rgb",
            defaultValue: [1,1,1]
        }, {
            name: "intensity",
            displayName: "Intensity",
            description: "The intensity of the light",
            type: "number",
            defaultValue: 1,
            options: {
                min: 0,
                max: 10,
                step: 0.05
            }
        }, {
            name: "castShadows",
            displayName: "Cast Shadows",
            description: "Cast shadows from this light",
            type: "boolean",
            defaultValue: false
        }, {
            name: 'shadowDistance',
            displayName: 'Shadow Distance',
            description: 'Camera distance at which shadows are no longer rendered',
            type: 'number',
            options: {
                min: 0,
                decimalPrecision: 5
            },
            defaultValue: 40,
            filter: {
                castShadows: true,
                type: 'directional'
            }
        }, {
            name: "shadowResolution",
            displayName: "Shadow Resolution",
            description: "Resolution of shadowmap generated by this light",
            type: "enumeration",
            options: {
                enumerations: [{
                    name: '128',
                    value: 128
                }, {
                    name: '256',
                    value: 256
                }, {
                    name: '512',
                    value: 512
                }, {
                    name: '1024',
                    value: 1024
                }, {
                    name: '2048',
                    value: 2048
                }]
            },
            defaultValue: 1024,
            filter: {
                castShadows: true
            }
        }, {
            name: 'shadowBias',
            displayName: 'Shadow Bias',
            description: 'Tunes the shadows to reduce rendering artifacts',
            type: 'number',
            options: {
                min: 0,
                max: 1,
                decimalPrecision: 5,
                step: 0.01
            },
            defaultValue: 0.05,
            filter: {
                castShadows: true
            }
        }, {
            name: "range",
            displayName: "Range",
            description: "The distance from the light where its contribution falls to zero",
            type: "number",
            defaultValue: 10,
            options: {
                min: 0
            },
            filter: {
                type: ['point', 'spot']
            }
        }, {
            name: "falloffMode",
            displayName: "Falloff mode",
            description: "Controls the rate at which a light attentuates from its position",
            type: "enumeration",
            options: {
                enumerations: [{
                    name: 'Linear',
                    value: pc.scene.LIGHTFALLOFF_LINEAR
                }, {
                    name: 'Inverse squared',
                    value: pc.scene.LIGHTFALLOFF_INVERSESQUARED
                }]
            },
            defaultValue: 0,
            filter: {
                type: ['point', 'spot']
            }
        }, {
            name: "innerConeAngle",
            displayName: "Inner Cone Angle",
            description: "Spotlight inner cone angle",
            type: "number",
            defaultValue: 40,
            options: {
                min: 0,
                max: 90
            },
            filter: {
                type: 'spot'
            }
        }, {
            name: "outerConeAngle",
            displayName: "Outer Cone Angle",
            description: "Spotlight outer cone angle",
            type: "number",
            defaultValue: 45,
            options: {
                min: 0,
                max: 90
            },
            filter: {
                type: 'spot'
            }
        }, {
            name: 'model',
            exposed: false
        }];

        this.exposeProperties();
        this.implementations = {};
        this.on('remove', this.onRemove, this);
        pc.fw.ComponentSystem.on('toolsUpdate', this.toolsUpdate, this);
    };

    LightComponentSystem = pc.inherits(LightComponentSystem, pc.fw.ComponentSystem);

    pc.extend(LightComponentSystem.prototype, {
        initializeComponentData: function (component, data, properties) {
            if (!data.type) {
                data.type = component.data.type;
            }

            component.data.type = data.type;

            if (data.color && pc.type(data.color) === 'array') {
                data.color = new pc.Color(data.color[0], data.color[1], data.color[2]);
            }

            if (data.enable) {
                console.warn("WARNING: enable: Property is deprecated. Set enabled property instead.");
                data.enabled = data.enable;
            }

            var implementation = this._createImplementation(data.type);
            implementation.initialize(component, data);

            properties = ['type', 'model', 'enabled', 'color', 'intensity', 'range', 'falloffMode', 'innerConeAngle', 'outerConeAngle', 'castShadows', 'shadowDistance', 'shadowResolution', 'shadowBias'];
            LightComponentSystem._super.initializeComponentData.call(this, component, data, properties);
        },

        _createImplementation: function (type) {
            var implementation = this.implementations[type];
            if (!implementation) {
                switch (type) {
                    case 'directional':
                        implementation = new DirectionalLightImplementation(this);
                        break;
                    case 'point':
                        implementation = new PointLightImplementation(this);
                        break;
                    case 'spot':
                        implementation = new SpotLightImplementation(this);
                        break;
                    default:
                        throw new Error("Invalid light type: " + type);
               }

               this.implementations[type] = implementation;
            }

            return implementation;
        },

        onRemove: function (entity, data) {
           this.implementations[data.type].remove(entity, data);
        },

        cloneComponent: function (entity, clone) {
            var light = entity.light;

            // create new data block for clone
            var data = {
                type: light.type,
                enabled: light.enabled,
                color: [light.color.r, light.color.g, light.color.b],
                intensity: light.intensity,
                range: light.range,
                innerConeAngle: light.innerConeAngle,
                outerConeAngle: light.outerConeAngle,
                castShadows: light.castShadows,
                shadowDistance: light.shadowDistance,
                shadowResolution: light.shadowResolution,
                falloffMode: light.falloffMode,
                shadowBias: light.shadowBias
            };

            this.addComponent(clone, data);
        },

        toolsUpdate: function (fn) {
            var components = this.store;
            for (var id in components) {
                if (components.hasOwnProperty(id)) {
                    var entity = components[id].entity;
                    var componentData = components[id].data;
                    var implementation = this.implementations[componentData.type];
                    if (implementation) {
                        implementation.toolsUpdate(componentData);
                    }
                }
            }
        },

        changeType: function (component, oldType, newType) {
            this.implementations[oldType].remove(component.entity, component.data);
            this._createImplementation(newType).initialize(component, component.data);
        }
    });

    /**
    * Light implementations
    */

    LightComponentImplementation = function (system) {
        this.system = system;
    };

    LightComponentImplementation.prototype = {
        initialize: function (component, data) {
            var node = this._createLightNode(component, data);
            this._createDebugShape(component, data, node);
        },

        _createLightNode: function (component, data) {
            var node = new pc.scene.LightNode();
            node.setName(data.type + "light");
            node.setType(this._getLightType());
            return node;
        },

        _getLightType: function () {
            return undefined;
        },

        _createDebugShape: function (component, data, node) {
            var context = this.system.context;

            var model = new pc.scene.Model();
            model.graph = node;
            model.lights = [ node ];

            if (context.designer) {
                this.mesh = this._createDebugMesh();

                if (!this.material) {
                    this.material = this._createDebugMaterial();
                }

                model.meshInstances = [ new pc.scene.MeshInstance(node, this.mesh, this.material) ];
            }

            context.scene.addModel(model);
            component.entity.addChild(node);

            data = data || {};
            data.model = model;
        },

        _createDebugMesh: function () {
            return undefined;
        },

        _createDebugMaterial: function () {
            return undefined;
        },

        remove: function(entity, data) {
            var context = this.system.context;
            entity.removeChild(data.model.graph);
            context.scene.removeModel(data.model);
            delete data.model;
        },

        toolsUpdate: function (data) {

        }
    };

    /**
    * Directional Light implementation
    */

    DirectionalLightImplementation = function (system) {};
    DirectionalLightImplementation = pc.inherits(DirectionalLightImplementation, LightComponentImplementation);
    DirectionalLightImplementation.prototype = pc.extend(DirectionalLightImplementation.prototype, {
        _getLightType: function() {
            return pc.scene.LIGHTTYPE_DIRECTIONAL;
        },

        _createDebugMesh: function () {
            if (this.mesh) {
                return this.mesh;
            }

            var context = this.system.context;
            var format = new pc.gfx.VertexFormat(context.graphicsDevice, [
                { semantic: pc.gfx.SEMANTIC_POSITION, components: 3, type: pc.gfx.ELEMENTTYPE_FLOAT32 }
            ]);

            // Generate the directional light arrow vertex data
            vertexData = [
                // Center arrow
                0, 0, 0, 0, -8, 0,       // Stalk
                -0.5, -8, 0, 0.5, -8, 0, // Arrowhead base
                0.5, -8, 0, 0, -10, 0,   // Arrowhead tip
                0, -10, 0, -0.5, -8, 0,  // Arrowhead tip
                // Lower arrow
                0, 0, -2, 0, -8, -2,         // Stalk
                -0.25, -8, -2, 0.25, -8, -2, // Arrowhead base
                0.25, -8, -2, 0, -10, -2,    // Arrowhead tip
                0, -10, -2, -0.25, -8, -2,    // Arrowhead tip
                // Lower arrow
                0, 0, 2, 0, -8, 2,         // Stalk
                -0.25, -8, 2, 0.25, -8, 2, // Arrowhead base
                0.25, -8, 2, 0, -10, 2,    // Arrowhead tip
                0, -10, 2, -0.25, -8, 2    // Arrowhead tip
            ];
            var rot = new pc.Mat4().setFromAxisAngle(pc.Vec3.UP, 120);
            var i;
            for (i = 0; i < 24; i++) {
                var pos = new pc.Vec3(vertexData[(i+8)*3], vertexData[(i+8)*3+1], vertexData[(i+8)*3+2]);
                var posRot = rot.transformPoint(pos, pos);
                vertexData[(i+24)*3]   = posRot[0];
                vertexData[(i+24)*3+1] = posRot[1];
                vertexData[(i+24)*3+2] = posRot[2];
            }
            // Copy vertex data into the vertex buffer
            var vertexBuffer = new pc.gfx.VertexBuffer(context.graphicsDevice, format, 32);
            var positions = new Float32Array(vertexBuffer.lock());
            for (i = 0; i < vertexData.length; i++) {
                positions[i] = vertexData[i];
            }
            vertexBuffer.unlock();
            var mesh = new pc.scene.Mesh();
            mesh.vertexBuffer = vertexBuffer;
            mesh.indexBuffer[0] = null;
            mesh.primitive[0].type = pc.gfx.PRIMITIVE_LINES;
            mesh.primitive[0].base = 0;
            mesh.primitive[0].count = vertexBuffer.getNumVertices();
            mesh.primitive[0].indexed = false;
            return mesh;
        },

        _createDebugMaterial: function () {
            var material = new pc.scene.BasicMaterial();
            material.color = new pc.Color(1, 1, 0, 1);
            material.update();
            return material;
        }

    });

    /**
    * Point Light implementation
    */

    PointLightImplementation = function (system) {};
    PointLightImplementation = pc.inherits(PointLightImplementation, LightComponentImplementation);
    PointLightImplementation.prototype = pc.extend(PointLightImplementation.prototype, {
        _getLightType: function() {
            return pc.scene.LIGHTTYPE_POINT;
        },

        _createDebugMesh: function () {
            if (this.mesh) {
                return this.mesh;
            }

            var context = this.system.context;
            return pc.scene.procedural.createSphere(context.graphicsDevice, {
                radius: 0.1
            });
        },

        _createDebugMaterial: function () {
            var material = new pc.scene.BasicMaterial();
            material.color = new pc.Color(1, 1, 0, 1);
            material.update();
            return material;
        }

    });


    /**
    * Spot Light implementation
    */

    SpotLightImplementation = function (system) {};
    SpotLightImplementation = pc.inherits(SpotLightImplementation, LightComponentImplementation);
    SpotLightImplementation.prototype = pc.extend(SpotLightImplementation.prototype, {
        _getLightType: function() {
            return pc.scene.LIGHTTYPE_SPOT;
        },

        _createDebugMesh: function () {
            var context = this.system.context;
            var indexBuffer = this.indexBuffer;
            if (!indexBuffer) {
                var indexBuffer = new pc.gfx.IndexBuffer(context.graphicsDevice, pc.gfx.INDEXFORMAT_UINT8, 88);
                var inds = new Uint8Array(indexBuffer.lock());
                // Spot cone side lines
                inds[0] = 0;
                inds[1] = 1;
                inds[2] = 0;
                inds[3] = 11;
                inds[4] = 0;
                inds[5] = 21;
                inds[6] = 0;
                inds[7] = 31;
                // Spot cone circle - 40 segments
                for (var i = 0; i < 40; i++) {
                    inds[8 + i * 2 + 0] = i + 1;
                    inds[8 + i * 2 + 1] = i + 2;
                }
                indexBuffer.unlock();
                this.indexBuffer = indexBuffer;
            }

            var vertexFormat = new pc.gfx.VertexFormat(context.graphicsDevice, [
                { semantic: pc.gfx.SEMANTIC_POSITION, components: 3, type: pc.gfx.ELEMENTTYPE_FLOAT32 }
            ]);

            var vertexBuffer = new pc.gfx.VertexBuffer(context.graphicsDevice, vertexFormat, 42, pc.gfx.BUFFER_DYNAMIC);

            var mesh = new pc.scene.Mesh();
            mesh.vertexBuffer = vertexBuffer;
            mesh.indexBuffer[0] = indexBuffer;
            mesh.primitive[0].type = pc.gfx.PRIMITIVE_LINES;
            mesh.primitive[0].base = 0;
            mesh.primitive[0].count = indexBuffer.getNumIndices();
            mesh.primitive[0].indexed = true;

            return mesh;

        },

        _createDebugMaterial: function () {
            return new pc.scene.BasicMaterial();
        },

        toolsUpdate: function (data) {
            var model = data.model;
            var meshInstance = model.meshInstances[0];
            var vertexBuffer = meshInstance.mesh.vertexBuffer;

            var oca = Math.PI * data.outerConeAngle / 180;
            var ae = data.range;
            var y = -ae * Math.cos(oca);
            var r = ae * Math.sin(oca);

            var positions = new Float32Array(vertexBuffer.lock());
            positions[0] = 0;
            positions[1] = 0;
            positions[2] = 0;
            var numVerts = vertexBuffer.getNumVertices();
            for (var i = 0; i < numVerts-1; i++) {
                var theta = 2 * Math.PI * (i / (numVerts-2));
                var x = r * Math.cos(theta);
                var z = r * Math.sin(theta);
                positions[(i+1)*3+0] = x;
                positions[(i+1)*3+1] = y;
                positions[(i+1)*3+2] = z;
            }
            vertexBuffer.unlock();
        }
    });

    return {
        LightComponentSystem: LightComponentSystem
    };
}());


