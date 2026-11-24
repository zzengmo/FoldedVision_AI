using UnityEngine;

namespace FoldedVision
{
    public class FactorySignage : MonoBehaviour
    {
        public Shader signageShader;
        Material signMaterial;
        Font font;

        void Start()
        {
            var signs = GetComponentsInChildren<TextMesh>(true);
            if (signs.Length == 0 || signageShader == null) return;
            font = signs[0].font;
            if (font == null) return;
            signMaterial = new Material(signageShader);
            RefreshAtlas(font);
            Font.textureRebuilt += RefreshAtlas;
            foreach (var text in signs)
                text.GetComponent<MeshRenderer>().sharedMaterial = signMaterial;
        }

        // 표지판은 다른 장비 뒤에서 보이지 않도록 폰트 아틀라스만 공유한다.
        void RefreshAtlas(Font changed)
        {
            if (changed == font && signMaterial != null)
                signMaterial.mainTexture = font.material.mainTexture;
        }

        void OnDestroy()
        {
            Font.textureRebuilt -= RefreshAtlas;
            if (signMaterial != null) Destroy(signMaterial);
        }
    }
}
