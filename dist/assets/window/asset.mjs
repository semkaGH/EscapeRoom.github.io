import {orientation} from './orientation.mjs';
export {orientation};
import {openAsset} from './loader.mjs';
// Runtime bundled into every asset.mjs. The application supplies its installed THREE.
// Compressed resources are relative files; serve this entire directory over HTTP(S).
export const metadata = Object.freeze({orientation,"schema":"asset-web-module/1","itemId":"01-L1-0040","name":"百叶通风窗","defaultState":"closed","sourceUpAxis":"Z","units":"metres","geometryEncoding":"float32-le-base64","textureEncoding":"lossless-png","profile":"STATE","unifiedMaterials":{"e28625abbbcd51905e6d5e39827a48ff2a8ee37d61fdb0eaf5a6f190d045a2f9":{"finish_id":"paint.timber.white.satin","family":"paint","recipe_version":"1.0.0","canonical_material_id":"paint.timber.white.satin","canonical_recipe_sha256":"a1f2233fe0e623805afc65151cc9033055c6e6d11a12c319a51e98aab2312a62","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"db019881990b968e5cc98a551d4457d06a400e068c08afcd0c0c93c3457ea814":{"finish_id":"paint.timber.white.satin","family":"paint","recipe_version":"1.0.0","canonical_material_id":"paint.timber.white.satin","canonical_recipe_sha256":"a1f2233fe0e623805afc65151cc9033055c6e6d11a12c319a51e98aab2312a62","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"c1acea34ed7f783acf7a21ec22b234ab528744d9c96b979669fa470b57ddb6cd":{"finish_id":"paint.timber.white.satin","family":"paint","recipe_version":"1.0.0","canonical_material_id":"paint.timber.white.satin","canonical_recipe_sha256":"a1f2233fe0e623805afc65151cc9033055c6e6d11a12c319a51e98aab2312a62","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"8e9af2d709b3671e9241cc2754ca4919fd244fd2d7263f1edce5f1387dfbdeff":{"finish_id":"metal.bronze.oxidized_dark","family":"metal","recipe_version":"1.0.0","canonical_material_id":"metal.bronze.oxidized_dark","canonical_recipe_sha256":"f2edb2012f22f1e0804e1a44e306bd395d93a6604117df4455fb44b1e71cb83f","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"7e1adefb190944dfcca8e09dbf03c54bec5a388313d12d2bb135f0f6b7593a6a":{"finish_id":"metal.bronze.oxidized_dark","family":"metal","recipe_version":"1.0.0","canonical_material_id":"metal.bronze.oxidized_dark","canonical_recipe_sha256":"f2edb2012f22f1e0804e1a44e306bd395d93a6604117df4455fb44b1e71cb83f","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"e86cbcfd78d4b7306c92edf6615b2fef4f8802ac7f32a6077cee199674f2c98c":{"finish_id":"metal.bronze.oxidized_dark","family":"metal","recipe_version":"1.0.0","canonical_material_id":"metal.bronze.oxidized_dark","canonical_recipe_sha256":"f2edb2012f22f1e0804e1a44e306bd395d93a6604117df4455fb44b1e71cb83f","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"653581c5dcff91d5143fc992e0700af7558e38757849611ebce68276c10ad9a9":{"finish_id":"metal.bronze.oxidized_dark","family":"metal","recipe_version":"1.0.0","canonical_material_id":"metal.bronze.oxidized_dark","canonical_recipe_sha256":"f2edb2012f22f1e0804e1a44e306bd395d93a6604117df4455fb44b1e71cb83f","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"cc863f2c7c2036576b1dfd8b0117c5b8c2451c70c77eb38394fbd72675076f08":{"finish_id":"metal.bronze.oxidized_dark","family":"metal","recipe_version":"1.0.0","canonical_material_id":"metal.bronze.oxidized_dark","canonical_recipe_sha256":"f2edb2012f22f1e0804e1a44e306bd395d93a6604117df4455fb44b1e71cb83f","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"d8cce50a1c195a72de5c2a879fdaf7289bacd2cc6b99fab1eae46d7da5c735cf":{"finish_id":"metal.bronze.oxidized_dark","family":"metal","recipe_version":"1.0.0","canonical_material_id":"metal.bronze.oxidized_dark","canonical_recipe_sha256":"f2edb2012f22f1e0804e1a44e306bd395d93a6604117df4455fb44b1e71cb83f","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"b013adc7fe818696fa293d40747941580351baa36a2a41dbe74269ce98093faa":{"finish_id":"metal.bronze.oxidized_dark","family":"metal","recipe_version":"1.0.0","canonical_material_id":"metal.bronze.oxidized_dark","canonical_recipe_sha256":"f2edb2012f22f1e0804e1a44e306bd395d93a6604117df4455fb44b1e71cb83f","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"4530648d7de0d77e04c1217657377f95d2bb31a6583015f22bcd0169fd2ba146":{"finish_id":"metal.bronze.oxidized_dark","family":"metal","recipe_version":"1.0.0","canonical_material_id":"metal.bronze.oxidized_dark","canonical_recipe_sha256":"f2edb2012f22f1e0804e1a44e306bd395d93a6604117df4455fb44b1e71cb83f","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"9f33502ddeb6665be9b48ef5ccfd7ec578d411f0b1f9ea64853ce0403b799d6f":{"finish_id":"metal.bronze.oxidized_dark","family":"metal","recipe_version":"1.0.0","canonical_material_id":"metal.bronze.oxidized_dark","canonical_recipe_sha256":"f2edb2012f22f1e0804e1a44e306bd395d93a6604117df4455fb44b1e71cb83f","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"4c726d6fa3257dca740f8e6993530ed1dda48d99f296345e0f83a5a48591a553":{"finish_id":"metal.bronze.oxidized_dark","family":"metal","recipe_version":"1.0.0","canonical_material_id":"metal.bronze.oxidized_dark","canonical_recipe_sha256":"f2edb2012f22f1e0804e1a44e306bd395d93a6604117df4455fb44b1e71cb83f","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"e2d78962a890d15cbbf8176df26c85d5fc98bcb9d974068bcce1c69acce7c96b":{"finish_id":"metal.bronze.oxidized_dark","family":"metal","recipe_version":"1.0.0","canonical_material_id":"metal.bronze.oxidized_dark","canonical_recipe_sha256":"f2edb2012f22f1e0804e1a44e306bd395d93a6604117df4455fb44b1e71cb83f","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"eab6de7604681f3794af2833b61d720010fa223fc5c266373c42f896d7426a4c":{"finish_id":"metal.bronze.oxidized_dark","family":"metal","recipe_version":"1.0.0","canonical_material_id":"metal.bronze.oxidized_dark","canonical_recipe_sha256":"f2edb2012f22f1e0804e1a44e306bd395d93a6604117df4455fb44b1e71cb83f","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"a10bf22344e6693daaa13a622e748b2d233701988818c74d5dce7e4aa1146fca":{"finish_id":"metal.bronze.oxidized_dark","family":"metal","recipe_version":"1.0.0","canonical_material_id":"metal.bronze.oxidized_dark","canonical_recipe_sha256":"f2edb2012f22f1e0804e1a44e306bd395d93a6604117df4455fb44b1e71cb83f","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"72fd63fc8bbe02674d7dbe28d42a532c5638245f64aeb0e0bfcf457efe5d2c02":{"finish_id":"metal.bronze.oxidized_dark","family":"metal","recipe_version":"1.0.0","canonical_material_id":"metal.bronze.oxidized_dark","canonical_recipe_sha256":"f2edb2012f22f1e0804e1a44e306bd395d93a6604117df4455fb44b1e71cb83f","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"61285e72a5a938f14286cfaa1c12c5bcf953211d87e3473bb2cd3529d7b8297e":{"finish_id":"metal.bronze.oxidized_dark","family":"metal","recipe_version":"1.0.0","canonical_material_id":"metal.bronze.oxidized_dark","canonical_recipe_sha256":"f2edb2012f22f1e0804e1a44e306bd395d93a6604117df4455fb44b1e71cb83f","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"45ba1d8be2cf1ca361fece82150d73cb3a237cb7780cb48713bac75d0e9ca5a4":{"finish_id":"metal.bronze.oxidized_dark","family":"metal","recipe_version":"1.0.0","canonical_material_id":"metal.bronze.oxidized_dark","canonical_recipe_sha256":"f2edb2012f22f1e0804e1a44e306bd395d93a6604117df4455fb44b1e71cb83f","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"25a84efb5f14c2c388dd4db2d9fa34cd5cc5480dfdd7d6370ef104dbcdaaa257":{"finish_id":"paint.timber.white.satin","family":"paint","recipe_version":"1.0.0","canonical_material_id":"paint.timber.white.satin","canonical_recipe_sha256":"a1f2233fe0e623805afc65151cc9033055c6e6d11a12c319a51e98aab2312a62","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"71fbee85c36884f8202f3c52f0ca63c7e552f329dcd60fb5042c19a509a3f062":{"finish_id":"paint.timber.white.satin","family":"paint","recipe_version":"1.0.0","canonical_material_id":"paint.timber.white.satin","canonical_recipe_sha256":"a1f2233fe0e623805afc65151cc9033055c6e6d11a12c319a51e98aab2312a62","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"14fa456bde657c0e62fed0dba7ee0daf8188e149b1453e9bab4b2262685daf14":{"finish_id":"paint.timber.white.satin","family":"paint","recipe_version":"1.0.0","canonical_material_id":"paint.timber.white.satin","canonical_recipe_sha256":"a1f2233fe0e623805afc65151cc9033055c6e6d11a12c319a51e98aab2312a62","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"76094dd3621063ba7865e6ee5006c0b0d64f84464995a24fd31edaed753c7708":{"finish_id":"paint.timber.white.satin","family":"paint","recipe_version":"1.0.0","canonical_material_id":"paint.timber.white.satin","canonical_recipe_sha256":"a1f2233fe0e623805afc65151cc9033055c6e6d11a12c319a51e98aab2312a62","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"c13d3426786783bed91bb3092ae705dfc36d662c598a093048a92150216ed118":{"finish_id":"metal.bronze.oxidized_dark","family":"metal","recipe_version":"1.0.0","canonical_material_id":"metal.bronze.oxidized_dark","canonical_recipe_sha256":"f2edb2012f22f1e0804e1a44e306bd395d93a6604117df4455fb44b1e71cb83f","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"5b120d2c00e8444dc5193b2ae1164666fde984511836df815fe15eafc2331a8d":{"finish_id":"metal.bronze.oxidized_dark","family":"metal","recipe_version":"1.0.0","canonical_material_id":"metal.bronze.oxidized_dark","canonical_recipe_sha256":"f2edb2012f22f1e0804e1a44e306bd395d93a6604117df4455fb44b1e71cb83f","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"fda96e2bcf7d76fccdd258ff55cb041ad8013a2eab7f22071d971ce2f1f67b97":{"finish_id":"metal.bronze.oxidized_dark","family":"metal","recipe_version":"1.0.0","canonical_material_id":"metal.bronze.oxidized_dark","canonical_recipe_sha256":"f2edb2012f22f1e0804e1a44e306bd395d93a6604117df4455fb44b1e71cb83f","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"90ab0bbef9576678ed78fb2fdb89525c1aa4d2873fbaa783024baa6a5d1ed6b9":{"finish_id":"metal.bronze.oxidized_dark","family":"metal","recipe_version":"1.0.0","canonical_material_id":"metal.bronze.oxidized_dark","canonical_recipe_sha256":"f2edb2012f22f1e0804e1a44e306bd395d93a6604117df4455fb44b1e71cb83f","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"91b7edcedfe4185816e1801b4602d8d4feef04bf3ac87d8352bc2080e022679b":{"finish_id":"metal.bronze.oxidized_dark","family":"metal","recipe_version":"1.0.0","canonical_material_id":"metal.bronze.oxidized_dark","canonical_recipe_sha256":"f2edb2012f22f1e0804e1a44e306bd395d93a6604117df4455fb44b1e71cb83f","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"6e72bceb6f57e6ec019d63d9ea878a7ae3ce832cbe0fd2df68f514285a8e7679":{"finish_id":"metal.bronze.oxidized_dark","family":"metal","recipe_version":"1.0.0","canonical_material_id":"metal.bronze.oxidized_dark","canonical_recipe_sha256":"f2edb2012f22f1e0804e1a44e306bd395d93a6604117df4455fb44b1e71cb83f","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"8d56638ad0f90511168f10a34114442029b145e35d55a65ddc21f45b146d0441":{"finish_id":"metal.bronze.oxidized_dark","family":"metal","recipe_version":"1.0.0","canonical_material_id":"metal.bronze.oxidized_dark","canonical_recipe_sha256":"f2edb2012f22f1e0804e1a44e306bd395d93a6604117df4455fb44b1e71cb83f","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"e9299c2c21fb3625dfaaa05d816f79294ba502e33f8bf0a3bc7483da98c811d9":{"finish_id":"metal.bronze.oxidized_dark","family":"metal","recipe_version":"1.0.0","canonical_material_id":"metal.bronze.oxidized_dark","canonical_recipe_sha256":"f2edb2012f22f1e0804e1a44e306bd395d93a6604117df4455fb44b1e71cb83f","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"9124b02db15c0ee427fe349d77aa037a48c4cd7e49cd1c338e6147de2dbbe4ec":{"finish_id":"metal.bronze.oxidized_dark","family":"metal","recipe_version":"1.0.0","canonical_material_id":"metal.bronze.oxidized_dark","canonical_recipe_sha256":"f2edb2012f22f1e0804e1a44e306bd395d93a6604117df4455fb44b1e71cb83f","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"ad30f1f75367b73b4efd7f6cac3dc1d1f9a290376285419620149d304e0e1596":{"finish_id":"metal.bronze.oxidized_dark","family":"metal","recipe_version":"1.0.0","canonical_material_id":"metal.bronze.oxidized_dark","canonical_recipe_sha256":"f2edb2012f22f1e0804e1a44e306bd395d93a6604117df4455fb44b1e71cb83f","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"97d8ceb31dd5be24feb587cb1ca4a12ab8e9f406d70c25767c714598d2d89619":{"finish_id":"metal.bronze.oxidized_dark","family":"metal","recipe_version":"1.0.0","canonical_material_id":"metal.bronze.oxidized_dark","canonical_recipe_sha256":"f2edb2012f22f1e0804e1a44e306bd395d93a6604117df4455fb44b1e71cb83f","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"00085d715dbc1565618cf5aefe55336217079a8e27164a2ef6943c529cc8ce70":{"finish_id":"metal.bronze.oxidized_dark","family":"metal","recipe_version":"1.0.0","canonical_material_id":"metal.bronze.oxidized_dark","canonical_recipe_sha256":"f2edb2012f22f1e0804e1a44e306bd395d93a6604117df4455fb44b1e71cb83f","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"d040335e55bf96c77e6da844d393c421f218b1fa40e58645d66f3cec4c90c5dd":{"finish_id":"paint.timber.white.satin","family":"paint","recipe_version":"1.0.0","canonical_material_id":"paint.timber.white.satin","canonical_recipe_sha256":"a1f2233fe0e623805afc65151cc9033055c6e6d11a12c319a51e98aab2312a62","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."},"bfcac0dc46c5fac68e51a7cb041442b869f0aac70102685a3f96ba821651464b":{"finish_id":"paint.timber.white.satin","family":"paint","recipe_version":"1.0.0","canonical_material_id":"paint.timber.white.satin","canonical_recipe_sha256":"a1f2233fe0e623805afc65151cc9033055c6e6d11a12c319a51e98aab2312a62","mode":"standard","material_source":"Actual final saved native shader; freshly baked PBR channels."}},"styleV2":{"revision":"direct-v2-436b771fcaebdbbc2eea","registry":{"path":"/Users/moonshot/Documents/asset-library/material-unification-v1/research/direct_rigid2_oak19_v1/shared_finish_v1/registry.json","sha256":"e2f460bdbee04f11efa5b6b71cfefe5721f216c37dbff4ce0793dc6e96924449"},"mappingSha256":"a529f69e10795a2fbd09ea3298134ceb1a16de0fdd427c828ce20e974ffa7a81","mode":"standard","sourceStateBlendSha256":{"closed":"8ec0eee8aef565432d7bd5b03b9fb80903783897cc8687603e281f8751f75e85","open":"41ee4208c3066aa01fcf6e35b5b033e44a2b6aa07c8ace8878c04a4b8cdcf203"}},"limitations":["Saved states exposed in Web; public parametric generation remains in source/build.py.","Final native PBR channels are finite-resolution UV textures; Cycles and three.js lighting are not pixel-identical.","The native shared library is hash-bound at the registry workspace path."]});
export const availableStates = Object.freeze(["closed","open"]);

export async function createAsset(THREE, options = {}) {
  if (!THREE?.Group || !THREE?.BufferGeometry || !THREE?.MeshPhysicalMaterial)
    throw new TypeError('Pass the three.js namespace to createAsset(THREE, options)');
  const requested = options.state ?? metadata.defaultState;
  const session = await openAsset(THREE, new URL('./', import.meta.url), options);
  const DATA = session.data;
  try {
  if (!DATA.states[requested]) throw new RangeError(`Unknown asset state: ${requested}`);
  const geometries = session.geometries, materials = new Map(), textures = session.textures;
  const floats = session.array;
  const root = new THREE.Group();
  root.name = metadata.name;
  root.userData.asset = metadata;
  root.userData.availableStates = [...availableStates];
  if ((options.upAxis ?? 'Y') === 'Y') root.rotation.x = -Math.PI / 2;
  else if (options.upAxis !== 'Z') throw new RangeError('upAxis must be Y or Z');
  const loadTexture = options.loadTexture ?? ((uri) => new THREE.TextureLoader().loadAsync(uri));
  async function texture(id, color) {
    const key = `${id}:${color}`;
    if (!textures.has(key)) textures.set(key, (async () => {
      const t = await session.loadTexture(session.uri(id), loadTexture);
      t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.flipY = true; // native Blender UVs, unlike the glTF convention
      t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
      // Continuous coverage proof bounds the exact level-zero bilinear footprint.
      t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
      t.needsUpdate = true;
      return t;
    })());
    return textures.get(key);
  }
  async function material(id) {
    if (!materials.has(id)) materials.set(id, (async () => {
      const d = DATA.materials[id], p = d.properties;
      const m = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(...p.color), metalness: p.metalness,
        roughness: p.roughness, opacity: p.opacity, transparent: p.transparent,
        ior: p.ior, transmission: p.transmission, clearcoat: p.clearcoat,
        clearcoatRoughness: p.clearcoatRoughness,
        emissive: new THREE.Color(...p.emissive), emissiveIntensity: p.emissiveIntensity,
        specularIntensity: p.specularIntensity, specularColor: new THREE.Color(...p.specularColor),
        sheen: p.sheen ?? 0, sheenColor: new THREE.Color(...(p.sheenColor ?? [1,1,1])),
        sheenRoughness: p.sheenRoughness ?? .5,
        anisotropy: p.anisotropy ?? 0, anisotropyRotation: p.anisotropyRotation ?? 0,
        side: THREE.DoubleSide,
        vertexColors: Boolean(d.vertexColor),
      });
      m.name = d.name; m.userData.blenderMaterial = d.name;
      Object.assign(m.userData, DATA.metadata.unifiedMaterials[id]);
      if (d.vertexColor) m.userData.vertexColorContract = d.vertexColor;
      if (d.vertexColor?.emission_vertex_multiplier) {
        // Three's ordinary vertex color path affects diffuse/alpha only.
        // The native source feeds the same interpolated RGB to emission too.
        m.onBeforeCompile = shader => {
          const token = '#include <emissivemap_fragment>';
          if (shader.fragmentShader.split(token).length !== 2) throw new Error('Unsupported Three emission shader boundary');
          shader.fragmentShader = shader.fragmentShader.replace(token, token + '\n#if defined(USE_COLOR) || defined(USE_COLOR_ALPHA)\n totalEmissiveRadiance *= vColor.rgb;\n#endif\n');
        };
        m.customProgramCacheKey = () => 'native-vertex-rgb-emission-v1';
      }
      // Room 13 restyles all surfaces with shared materials; unused PBR maps are not fetched.
      return m;
    })());
    return materials.get(id);
  }
  function geometry(id) {
    if (!geometries.has(id)) {
      const d = DATA.geometries[id], g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(floats(d.position), 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(floats(d.normal), 3));
      if (d.color) g.setAttribute('color', new THREE.Float32BufferAttribute(floats(d.color), 4));
      const uv = floats(d.uv);
      if (uv.length) g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      if (d.index) g.setIndex(new THREE.BufferAttribute(floats(d.index), 1));
      for (const [start, count, slot] of d.groups) g.addGroup(start, count, slot);
      g.computeBoundingBox(); g.computeBoundingSphere();
      geometries.set(id, g);
    }
    return geometries.get(id);
  }
  // States are actual saved Blender scenes. Swapping states does not pretend that
  // arbitrary procedural Python parameters are available as JavaScript parameters.
  const stateGroups = new Map();
  const building = new Map();
  let disposed = false;
  async function buildState(name) {
    if (disposed) throw new Error('Asset has been disposed');
    if (stateGroups.has(name)) return;
    await session.prepare(name);
    const state = DATA.states[name];
    await Promise.all([...new Set(state.nodes.flatMap(n => n.materials || []).filter(id => id !== null))].map(material));
    const container = new THREE.Group(); container.name = `state:${name}`;
    const nodes = new Map();
    for (const d of state.nodes) {
      const o = d.geometry
        ? new THREE.Mesh(geometry(d.geometry), await Promise.all(d.materials.map(material)))
        : new THREE.Group();
      o.name = d.name; o.visible = d.visible;
      o.matrix.fromArray(d.matrix); o.matrix.decompose(o.position, o.quaternion, o.scale);
      o.matrixAutoUpdate = false;
      o.userData = {...d.properties, blenderType: d.type, assetNode: d.name};
      o.castShadow = true; o.receiveShadow = true; nodes.set(d.name, o);
    }
    for (const d of state.nodes) (nodes.get(d.parent) ?? container).add(nodes.get(d.name));
    container.visible = name === requested;
    root.add(container); stateGroups.set(name, container);
  }
  async function prepareState(name) {
    if (disposed) throw new Error('Asset has been disposed');
    if (!DATA.states[name]) throw new RangeError(`Unknown asset state: ${name}`);
    if (!building.has(name)) building.set(name, buildState(name).catch(e => {building.delete(name);throw e;}));
    await building.get(name);
    return root;
  }
  for (const name of (options.states === 'lazy' ? [requested] : availableStates)) await prepareState(name);
  root.prepareState = prepareState;
  let switchRequest = 0;
  root.setState = (name) => {
    if (disposed) throw new Error('Asset has been disposed');
    const token = ++switchRequest;
    if (!stateGroups.has(name) && DATA.states[name]) return prepareState(name).then(() => token === switchRequest ? root.setState(name) : root);
    if (!stateGroups.has(name)) throw new RangeError(`Unknown asset state: ${name}`);
    for (const [state, group] of stateGroups) group.visible = state === name;
    root.userData.state = name;
    return root;
  };
  root.getStateObject = (name) => stateGroups.get(root.userData.state).getObjectByName(name);
  root.dispose = async () => {
    if (disposed) return; disposed = true;
    await Promise.allSettled(building.values());
    for (const m of materials.values()) (await m).dispose();
    await session.release();
  };
  root.setState(requested); root.updateMatrixWorld(true);
  return root;
  } catch (error) { await session.release(); throw error; }
}

export default createAsset;
