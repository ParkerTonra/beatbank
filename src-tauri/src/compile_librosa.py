import os
import numpy as np
import numba
from numba.pycc import CC

cc = CC('librosa_compiled')
cc.verbose = True

@cc.export('correlate_profiles', 'f4(f4[:], f4[:])')
def correlate_profiles(chroma_norm, profile_norm):
    """Optimized correlation calculation"""
    return np.dot(chroma_norm, profile_norm)

@cc.export('find_key_correlation', 'f4[:](f4[:], f4[:,:])')
def find_key_correlation(chroma_norm, profiles):
    """Calculate correlations for all profiles"""
    correlations = np.zeros(12, dtype=np.float32)
    for i in range(12):
        correlations[i] = np.dot(chroma_norm, profiles[i])
    return correlations

if __name__ == '__main__':
    # Compile to a Python extension module
    cc.compile()
