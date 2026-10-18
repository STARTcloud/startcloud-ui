let ready = null;

/**
 * The certificate engine, the vendored cipher-wasm module and its WASM,
 * the one module that imports them, so every page of the feature draws
 * at once and the engine is fetched only when a page asks for it, once
 * per page: the WASM initialized and the ten functions answered together.
 *
 * @returns {Promise<Object>} `detect`, `convert`, `public_key_hash`, `verify_signature`, `build_chain`, `compare`, `generate_key`, `make_csr`, `self_sign` and `sign_csr`
 */
export const loadCerts = () => {
  ready ||= import('@startcloud/cipher-wasm').then(engine =>
    engine
      .default({
        module_or_path: new URL('@startcloud/cipher-wasm/cipher_wasm_bg.wasm', import.meta.url),
      })
      .then(() => ({
        detect: engine.detect,
        convert: engine.convert,
        public_key_hash: engine.public_key_hash,
        verify_signature: engine.verify_signature,
        build_chain: engine.build_chain,
        compare: engine.compare,
        generate_key: engine.generate_key,
        make_csr: engine.make_csr,
        self_sign: engine.self_sign,
        sign_csr: engine.sign_csr,
      }))
  );
  return ready;
};
